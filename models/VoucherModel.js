// [BACKEND B] Model voucher / ví voucher / chương trình khuyến mãi dạng mã giảm giá (UC07, UC15)
const db = require('../config/db');
const { AppError } = require('../utils/errors');
const { money, likeEsc } = require('../utils/helpers');

const TINH_TRANG = `CASE WHEN v.NgayHetHan < CAST(SYSDATETIME() AS DATE) THEN N'Hết hạn'
                         WHEN v.SoLuotConLai <= 0 THEN N'Hết lượt'
                         WHEN v.NgayBatDau > CAST(SYSDATETIME() AS DATE) THEN N'Chưa bắt đầu'
                         ELSE N'Đang chạy' END`;

module.exports = {
  /** Ví voucher: mã còn dùng được của khách */
  wallet(maTK) {
    return db.query(`SELECT v.MaVoucher, v.MaCode, v.LoaiGiam, v.GiaTriGiam, v.DonToiThieu, v.NgayHetHan
                     FROM VI_VOUCHER w JOIN VOUCHER v ON v.MaVoucher = w.MaVoucher
                     WHERE w.MaTK=@maTK AND w.DaSuDung = 0 AND v.SoLuotConLai > 0
                       AND CAST(SYSDATETIME() AS DATE) BETWEEN v.NgayBatDau AND v.NgayHetHan
                     ORDER BY v.NgayHetHan`, { maTK });
  },
  /** Kiểm tra mã (hạn dùng, giá trị tối thiểu, số lượt, đã dùng chưa). ex = db hoặc tx. Trả về { voucher, giam } hoặc ném AppError nêu rõ lý do */
  async check(ex, code, maTK, tienHang) {
    const r = await ex.query(
      `SELECT v.*, w.DaSuDung, CASE WHEN CAST(SYSDATETIME() AS DATE) BETWEEN v.NgayBatDau AND v.NgayHetHan THEN 1 ELSE 0 END AS ConHan
       FROM VOUCHER v LEFT JOIN VI_VOUCHER w ON w.MaVoucher = v.MaVoucher AND w.MaTK = @maTK WHERE v.MaCode = @code`,
      { code: String(code || '').trim().toUpperCase(), maTK });
    const v = r[0];
    if (!v) throw new AppError('Mã giảm giá không tồn tại.');
    if (!v.ConHan) throw new AppError('Mã giảm giá đã hết hạn hoặc chưa đến ngày áp dụng.');
    if (v.SoLuotConLai <= 0) throw new AppError('Mã giảm giá đã hết lượt sử dụng.');
    if (v.DaSuDung) throw new AppError('Bạn đã sử dụng mã này rồi.');
    if (tienHang < v.DonToiThieu) throw new AppError(`Mã chỉ áp dụng cho đơn từ ${money(v.DonToiThieu)}.`);
    const giam = v.LoaiGiam === 'PHAN_TRAM' ? Math.floor((tienHang * v.GiaTriGiam) / 100) : Math.min(v.GiaTriGiam, tienHang);
    return { voucher: v, giam };
  },

  // ---------- Quản trị ----------
  async search({ q, tinhTrang }, { offset, size }) {
    const w = []; const p = {};
    if (q) { w.push('v.MaCode LIKE @q'); p.q = likeEsc(q); }
    if (tinhTrang) { w.push(`${TINH_TRANG} = @tt`); p.tt = tinhTrang; }
    const where = w.length ? 'WHERE ' + w.join(' AND ') : '';
    const total = (await db.query(`SELECT COUNT(*) AS n FROM VOUCHER v ${where}`, p))[0].n;
    const items = await db.query(
      `SELECT v.*, ${TINH_TRANG} AS TinhTrang,
              (SELECT COUNT(*) FROM DON_HANG d WHERE d.MaVoucher = v.MaVoucher AND d.MaTrangThai NOT IN (6)) AS DaDung,
              (SELECT COUNT(*) FROM VI_VOUCHER w WHERE w.MaVoucher = v.MaVoucher) AS TrongVi
       FROM VOUCHER v ${where} ORDER BY v.NgayHetHan DESC, v.MaVoucher DESC OFFSET @off ROWS FETCH NEXT @lim ROWS ONLY`, { ...p, off: offset, lim: size });
    return { items, total };
  },
  async find(id) { return (await db.query('SELECT * FROM VOUCHER WHERE MaVoucher = @id', { id }))[0]; },
  async create(v) {
    try {
      const r = await db.query(`INSERT INTO VOUCHER (MaCode, LoaiGiam, GiaTriGiam, DonToiThieu, SoLuotConLai, NgayBatDau, NgayHetHan) OUTPUT INSERTED.MaVoucher
                                VALUES (@code, @loai, @giaTri, @toiThieu, @luot, @bd, @hh)`, v);
      return r[0].MaVoucher;
    } catch (e) { if ([2627, 2601].includes(e.number)) throw new AppError('Mã giảm giá này đã tồn tại.'); throw e; }
  },
  async update(id, v) {
    await db.run(`UPDATE VOUCHER SET LoaiGiam=@loai, GiaTriGiam=@giaTri, DonToiThieu=@toiThieu, SoLuotConLai=@luot, NgayBatDau=@bd, NgayHetHan=@hh WHERE MaVoucher=@id`, { ...v, id });
  },
  /** Kết thúc sớm: đặt hạn dùng là hôm qua (không xóa để giữ lịch sử đơn hàng đã dùng) */
  async expire(id) { await db.run('UPDATE VOUCHER SET NgayHetHan = DATEADD(DAY, -1, CAST(SYSDATETIME() AS DATE)) WHERE MaVoucher = @id', { id }); },
  async remove(id) {
    const used = (await db.query('SELECT COUNT(*) AS n FROM DON_HANG WHERE MaVoucher = @id', { id }))[0].n;
    if (used > 0) throw new AppError('Mã đã được dùng trong đơn hàng nên không thể xóa. Hãy dùng "Kết thúc" để dừng mã.');
    await db.transaction(async (tx) => {
      await tx.run('DELETE FROM VI_VOUCHER WHERE MaVoucher = @id', { id });
      await tx.run('DELETE FROM VOUCHER WHERE MaVoucher = @id', { id });
    });
  },
  /** Phát mã vào ví khách: all = mọi khách đang hoạt động, hang = theo hạng, email = một khách. Trả về số khách nhận được mã */
  async distribute(id, { doiTuong, maHang, email }) {
    const w = []; const p = { id };
    if (doiTuong === 'hang') { w.push('AND tk.MaHang = @maHang'); p.maHang = maHang; }
    if (doiTuong === 'email') { w.push('AND tk.Email = @email'); p.email = email; }
    const r = await db.run(`INSERT INTO VI_VOUCHER (MaTK, MaVoucher)
      SELECT tk.MaTK, @id FROM TAI_KHOAN tk JOIN VAI_TRO vt ON vt.MaVaiTro = tk.MaVaiTro
      WHERE vt.TenVaiTro = N'Customer' AND tk.TrangThai = N'Hoạt động' ${w.join(' ')}
        AND NOT EXISTS (SELECT 1 FROM VI_VOUCHER x WHERE x.MaTK = tk.MaTK AND x.MaVoucher = @id)`, p);
    return r.rowsAffected[0];
  }
};
