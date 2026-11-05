// [BACKEND B] Model đơn hàng: đặt hàng (giao dịch), tra cứu, đổi trạng thái, hủy đơn (hoàn tồn kho), nhật ký tồn kho
const db = require('../config/db');
const C = require('../config/constants');
const { AppError } = require('../utils/errors');
const { likeEsc, money } = require('../utils/helpers');
const VoucherModel = require('./VoucherModel');
const TierModel = require('./TierModel');

const shipFee = (tienHang) => (tienHang >= C.FREE_SHIP_FROM ? 0 : C.SHIP_FEE);

module.exports = {
  shipFee,

  /**
   * ĐẶT HÀNG: kiểm tra lại tồn kho + giá + mã -> tạo đơn -> trừ tồn kho -> xóa các dòng đã đặt khỏi giỏ, tất cả trong MỘT giao dịch.
   * selected: danh sách MaBT khách chọn để đặt (null = cả giỏ). Dòng không chọn được giữ nguyên trong giỏ.
   * Trừ kho bằng UPDATE có điều kiện (SoLuongTon >= SL) nên hai người đặt cùng lúc món cuối cùng chỉ một người thành công.
   */
  async create(maTK, { ten, sdt, diaChi, ghiChu, maPT, voucherCode, selected }) {
    return db.transaction(async (tx) => {
      // Khóa giỏ hàng của khách: hai lần bấm "Đặt hàng" cùng lúc sẽ được xử lý lần lượt, lần sau thấy giỏ trống => không tạo đơn trùng
      await tx.query('SELECT MaGH FROM GIO_HANG WITH (UPDLOCK, HOLDLOCK) WHERE MaTK = @maTK', { maTK });
      let lines = await tx.query(
        `SELECT ct.MaBT, ct.SoLuong, ct.GiaLucThem, bt.SKU, sp.TenSP, sp.GiaBan, sp.TrangThai
         FROM CHI_TIET_GIO_HANG ct JOIN GIO_HANG g ON g.MaGH = ct.MaGH
         JOIN BIEN_THE bt ON bt.MaBT = ct.MaBT JOIN SAN_PHAM sp ON sp.MaSP = bt.MaSP
         WHERE g.MaTK = @maTK`, { maTK });
      if (Array.isArray(selected)) lines = lines.filter((l) => selected.includes(l.MaBT));     // [] (bỏ chọn hết) => không có dòng nào => báo lỗi bên dưới
      if (!lines.length) throw new AppError('Giỏ hàng đang trống hoặc bạn chưa chọn sản phẩm nào để đặt.');
      for (const l of lines) {
        if (l.TrangThai !== C.SP.BAN) throw new AppError(`Sản phẩm "${l.TenSP}" đã ngừng bán, vui lòng xóa khỏi giỏ hàng.`);
        if (l.GiaLucThem !== null && Number(l.GiaLucThem) !== Number(l.GiaBan)) {
          throw new AppError(`Giá sản phẩm "${l.TenSP}" đã thay đổi từ ${money(l.GiaLucThem)} thành ${money(l.GiaBan)}. Vui lòng xem lại giỏ hàng và xác nhận giá mới trước khi đặt.`);
        }
      }

      const tienHang = lines.reduce((s, l) => s + l.GiaBan * l.SoLuong, 0);
      const phi = shipFee(tienHang);
      const hang = await TierModel.uuDai(tx, maTK, tienHang);              // ưu đãi hạng thành viên (0 nếu đang tắt)
      let giamVoucher = 0; let voucher = null;
      if (voucherCode) { const r = await VoucherModel.check(tx, voucherCode, maTK, tienHang); voucher = r.voucher; giamVoucher = Math.min(r.giam, tienHang - hang.giam); }
      const giam = hang.giam + giamVoucher;
      const tong = tienHang + phi - giam;

      const dh = await tx.query(
        `INSERT INTO DON_HANG (TenNguoiNhan, SDTNguoiNhan, DiaChiGiao, PhiVanChuyen, TienGiam, UuDaiHang, GhiChu, MaTK, MaTrangThai, MaVoucher)
         OUTPUT INSERTED.MaDH
         VALUES (@ten, @sdt, @diaChi, @phi, @giam, @uuDai, @ghiChu, @maTK, @st, @mv)`,
        { ten, sdt, diaChi, phi, giam, uuDai: hang.giam, ghiChu, maTK, st: C.STATUS.CHO, mv: voucher ? voucher.MaVoucher : null });
      const maDH = dh[0].MaDH;

      for (const l of lines) {
        const u = await tx.run('UPDATE BIEN_THE SET SoLuongTon = SoLuongTon - @sl WHERE MaBT=@maBT AND SoLuongTon >= @sl', { sl: l.SoLuong, maBT: l.MaBT });
        if (!u.rowsAffected[0]) throw new AppError(`Sản phẩm "${l.TenSP}" (${l.SKU}) không đủ tồn kho. Vui lòng cập nhật lại giỏ hàng.`);
        await tx.run('INSERT INTO CHI_TIET_DON_HANG (MaDH, MaBT, SoLuong, DonGia) VALUES (@maDH, @maBT, @sl, @gia)', { maDH, maBT: l.MaBT, sl: l.SoLuong, gia: l.GiaBan });
        await tx.run(`INSERT INTO LS_TON_KHO (MaBT, LoaiThaoTac, SoLuongThayDoi, TonSau, GhiChu, MaNguoiThucHien)
                      SELECT MaBT, N'Bán hàng', -@sl, SoLuongTon, @note, @maTK FROM BIEN_THE WHERE MaBT = @maBT`, { maBT: l.MaBT, sl: l.SoLuong, note: 'Đơn #' + maDH, maTK });
      }
      if (voucher) {
        const u1 = await tx.run('UPDATE VOUCHER SET SoLuotConLai = SoLuotConLai - 1 WHERE MaVoucher=@v AND SoLuotConLai > 0', { v: voucher.MaVoucher });
        if (!u1.rowsAffected[0]) throw new AppError('Mã giảm giá đã hết lượt sử dụng.');
        await tx.run('IF NOT EXISTS (SELECT 1 FROM VI_VOUCHER WHERE MaTK=@maTK AND MaVoucher=@v) INSERT INTO VI_VOUCHER (MaTK, MaVoucher) VALUES (@maTK, @v)', { maTK, v: voucher.MaVoucher });
        const u2 = await tx.run('UPDATE VI_VOUCHER SET DaSuDung = 1 WHERE MaTK=@maTK AND MaVoucher=@v AND DaSuDung = 0', { maTK, v: voucher.MaVoucher });
        if (!u2.rowsAffected[0]) throw new AppError('Bạn đã sử dụng mã này rồi.');
      }
      await tx.run('INSERT INTO THANH_TOAN (SoTien, MaDH, MaPT) VALUES (@tong, @maDH, @maPT)', { tong, maDH, maPT });
      await tx.run('INSERT INTO LICH_SU_DON_HANG (MaDH, MaTrangThai, MaNguoiDoi, GhiChu) VALUES (@maDH, @st, NULL, N\'Khách đặt hàng\')', { maDH, st: C.STATUS.CHO });
      // chỉ xóa các dòng đã đặt, dòng chưa chọn vẫn nằm trong giỏ
      const p = { maTK }; const ph = lines.map((l, i) => { p['b' + i] = l.MaBT; return '@b' + i; }).join(',');
      await tx.run(`DELETE ct FROM CHI_TIET_GIO_HANG ct JOIN GIO_HANG g ON g.MaGH = ct.MaGH WHERE g.MaTK = @maTK AND ct.MaBT IN (${ph})`, p);
      return { maDH, tong };
    });
  },

  paymentMethods() { return db.query('SELECT MaPT, TenPT FROM PHUONG_THUC_THANH_TOAN ORDER BY MaPT'); },
  statuses() { return db.query('SELECT MaTrangThai, TenTrangThai FROM TRANG_THAI_DON ORDER BY MaTrangThai'); },

  /** Tìm đơn: maTK có giá trị => chỉ đơn của khách đó; admin/staff dùng thêm q, tu, den */
  async search({ maTK, status, q, tu, den }, { offset, size }) {
    const w = []; const p = {};
    if (maTK) { w.push('dh.MaTK = @maTK'); p.maTK = maTK; }
    if (status) { w.push('dh.MaTrangThai = @status'); p.status = status; }
    if (q) {
      const n = /^\d+$/.test(q) ? parseInt(q, 10) : null;
      w.push(`(dh.TenNguoiNhan LIKE @q OR dh.SDTNguoiNhan LIKE @q OR tk.HoTen LIKE @q ${n ? 'OR dh.MaDH = @ma' : ''})`);
      p.q = likeEsc(q); if (n) p.ma = n;
    }
    if (tu) { w.push('CAST(dh.NgayDat AS DATE) >= CAST(@tu AS DATE)'); p.tu = tu; }
    if (den) { w.push('CAST(dh.NgayDat AS DATE) <= CAST(@den AS DATE)'); p.den = den; }
    const where = w.length ? 'WHERE ' + w.join(' AND ') : '';
    const from = `FROM DON_HANG dh JOIN TAI_KHOAN tk ON tk.MaTK = dh.MaTK JOIN TRANG_THAI_DON tt ON tt.MaTrangThai = dh.MaTrangThai
                  JOIN vw_TongTienDonHang v ON v.MaDH = dh.MaDH LEFT JOIN THANH_TOAN th ON th.MaDH = dh.MaDH
                  LEFT JOIN PHUONG_THUC_THANH_TOAN pt ON pt.MaPT = th.MaPT ${where}`;
    const total = (await db.query(`SELECT COUNT(*) AS n ${from}`, p))[0].n;
    const items = await db.query(
      `SELECT dh.MaDH, dh.NgayDat, dh.MaTrangThai, tt.TenTrangThai, dh.TenNguoiNhan, dh.SDTNguoiNhan, dh.MaTK, tk.HoTen, v.TongThanhToan, pt.TenPT, th.TrangThaiTT,
              (SELECT SUM(SoLuong) FROM CHI_TIET_DON_HANG WHERE MaDH = dh.MaDH) AS SoSanPham
       ${from} ORDER BY dh.NgayDat DESC, dh.MaDH DESC OFFSET @off ROWS FETCH NEXT @lim ROWS ONLY`, { ...p, off: offset, lim: size });
    return { items, total };
  },
  async statusCounts(maTK) {
    const r = await db.query(`SELECT MaTrangThai, COUNT(*) AS n FROM DON_HANG ${maTK ? 'WHERE MaTK=@maTK' : ''} GROUP BY MaTrangThai`, { maTK });
    const m = {}; let all = 0; r.forEach((x) => { m[x.MaTrangThai] = x.n; all += x.n; }); m.all = all; return m;
  },

  /** Chi tiết đơn; maTK != null => kiểm tra đơn thuộc về khách (khách chỉ xem được đơn của mình) */
  async detail(maDH, maTK = null) {
    const h = (await db.query(
      `SELECT dh.*, tt.TenTrangThai, v.TienHang, v.TongThanhToan, th.TrangThaiTT, th.NgayThanhToan, pt.TenPT,
              tk.HoTen, tk.Email, tk.SoDienThoai, vc.MaCode
       FROM DON_HANG dh JOIN TAI_KHOAN tk ON tk.MaTK = dh.MaTK JOIN TRANG_THAI_DON tt ON tt.MaTrangThai = dh.MaTrangThai
       JOIN vw_TongTienDonHang v ON v.MaDH = dh.MaDH LEFT JOIN THANH_TOAN th ON th.MaDH = dh.MaDH
       LEFT JOIN PHUONG_THUC_THANH_TOAN pt ON pt.MaPT = th.MaPT LEFT JOIN VOUCHER vc ON vc.MaVoucher = dh.MaVoucher
       WHERE dh.MaDH = @maDH ${maTK ? 'AND dh.MaTK = @maTK' : ''}`, { maDH, maTK }))[0];
    if (!h) return null;
    const [lines, history, doiTra] = await Promise.all([
      db.query(`SELECT ct.MaBT, ct.SoLuong, ct.DonGia, bt.SKU, sp.MaSP, sp.TenSP, sp.AnhDaiDien, sp.MaDM, ms.TenMau, kc.TenSize,
                       (SELECT TOP 1 a.MaAnh FROM ANH_SAN_PHAM a WHERE a.MaSP = sp.MaSP ORDER BY a.ThuTu, a.MaAnh) AS MaAnhDau
                FROM CHI_TIET_DON_HANG ct JOIN BIEN_THE bt ON bt.MaBT = ct.MaBT JOIN SAN_PHAM sp ON sp.MaSP = bt.MaSP
                JOIN MAU_SAC ms ON ms.MaMau = bt.MaMau JOIN KICH_CO kc ON kc.MaSize = bt.MaSize WHERE ct.MaDH = @maDH`, { maDH }),
      db.query(`SELECT ls.ThoiGian, ls.GhiChu, ls.MaTrangThai, t.TenTrangThai, tk.HoTen AS NguoiDoi
                FROM LICH_SU_DON_HANG ls JOIN TRANG_THAI_DON t ON t.MaTrangThai = ls.MaTrangThai LEFT JOIN TAI_KHOAN tk ON tk.MaTK = ls.MaNguoiDoi
                WHERE ls.MaDH = @maDH ORDER BY ls.ThoiGian, ls.MaLS`, { maDH }),
      db.query('SELECT TOP 1 * FROM YEU_CAU_DOI_TRA WHERE MaDH = @maDH ORDER BY MaYC DESC', { maDH })
    ]);
    // Mốc thời gian của từng bước trong tiến trình 5 bước (lần đầu đơn đạt trạng thái đó)
    const moc = {}; history.forEach((x) => { if (!moc[x.MaTrangThai]) moc[x.MaTrangThai] = x.ThoiGian; });
    const hoanThanh = moc[C.STATUS.HOAN_THANH] || null;
    const soNgay = hoanThanh ? Math.floor((Date.now() - new Date(hoanThanh).getTime()) / 86400000) : null;
    return { ...h, lines, history, moc, doiTra: doiTra[0] || null, soNgayHoanThanh: soNgay };
  },

  /**
   * Chuyển sang trạng thái KẾ TIẾP (không nhảy cóc, không quay lui). Ghi lịch sử; hoàn thành => đã thanh toán + cập nhật hạng khách.
   * expectFrom: nếu có, đơn phải đang ở đúng trạng thái này (dùng cho cập nhật hàng loạt).
   */
  async advance(maDH, userId, expectFrom = null) {
    return db.transaction(async (tx) => {
      const cur = (await tx.query('SELECT MaTrangThai, MaTK FROM DON_HANG WITH (UPDLOCK) WHERE MaDH=@maDH', { maDH }))[0];
      if (!cur) throw new AppError(`Không tìm thấy đơn hàng #${maDH}.`, 404);
      const from = cur.MaTrangThai;
      if (from >= C.STATUS.HOAN_THANH) throw new AppError(`Đơn #${maDH} đã kết thúc (${C.STATUS_NAME[from]}), không thể đổi trạng thái.`);
      if (expectFrom && from !== expectFrom) throw new AppError(`Đơn #${maDH} đang ở trạng thái "${C.STATUS_NAME[from]}", không thể chuyển sang "${C.STATUS_NAME[expectFrom + 1]}" (sai thứ tự).`);
      const next = from + 1;
      const u = await tx.run('UPDATE DON_HANG SET MaTrangThai=@next WHERE MaDH=@maDH AND MaTrangThai=@from', { next, maDH, from });
      if (!u.rowsAffected[0]) throw new AppError('Đơn hàng vừa được người khác cập nhật, vui lòng tải lại trang.');
      await tx.run('INSERT INTO LICH_SU_DON_HANG (MaDH, MaTrangThai, MaNguoiDoi, GhiChu) VALUES (@maDH, @next, @userId, @note)',
        { maDH, next, userId, note: 'Cập nhật trạng thái' });
      if (next === C.STATUS.HOAN_THANH) {
        await tx.run(`UPDATE THANH_TOAN SET TrangThaiTT = N'Đã thanh toán', NgayThanhToan = SYSDATETIME() WHERE MaDH=@maDH`, { maDH });
        await tx.run(TierModel.recomputeSql('AND tk.MaTK = @maTK'), { maTK: cur.MaTK });
      }
      return { from, next };
    });
  },

  /**
   * HỦY ĐƠN: chuyển sang Đã hủy + hoàn lại tồn kho + trả lại voucher, trong một giao dịch.
   * allowed: các trạng thái được phép hủy (khách: chỉ Chờ xác nhận; nhân viên: Chờ xác nhận / Đã xác nhận / Đang đóng gói)
   */
  async cancel(maDH, { allowed, userId, note, maTK = null }) {
    return db.transaction(async (tx) => {
      const ph = allowed.map((_, i) => '@s' + i).join(',');
      const p = { maDH, huy: C.STATUS.HUY, maTK };
      allowed.forEach((s, i) => { p['s' + i] = s; });
      const u = await tx.run(`UPDATE DON_HANG SET MaTrangThai=@huy WHERE MaDH=@maDH AND MaTrangThai IN (${ph}) ${maTK ? 'AND MaTK=@maTK' : ''}`, p);
      if (!u.rowsAffected[0]) throw new AppError('Không thể hủy đơn hàng ở trạng thái hiện tại.');
      await tx.run(`UPDATE bt SET bt.SoLuongTon = bt.SoLuongTon + ct.SoLuong
                    FROM BIEN_THE bt JOIN CHI_TIET_DON_HANG ct ON ct.MaBT = bt.MaBT WHERE ct.MaDH = @maDH`, { maDH });
      await tx.run(`INSERT INTO LS_TON_KHO (MaBT, LoaiThaoTac, SoLuongThayDoi, TonSau, GhiChu, MaNguoiThucHien)
                    SELECT bt.MaBT, N'Hoàn kho', ct.SoLuong, bt.SoLuongTon, @ghiChu, @userId
                    FROM BIEN_THE bt JOIN CHI_TIET_DON_HANG ct ON ct.MaBT = bt.MaBT WHERE ct.MaDH = @maDH`, { maDH, userId, ghiChu: 'Hủy đơn #' + maDH });
      await tx.run(`UPDATE VOUCHER SET SoLuotConLai = SoLuotConLai + 1 WHERE MaVoucher = (SELECT MaVoucher FROM DON_HANG WHERE MaDH=@maDH)`, { maDH });
      await tx.run(`UPDATE VI_VOUCHER SET DaSuDung = 0 WHERE MaVoucher = (SELECT MaVoucher FROM DON_HANG WHERE MaDH=@maDH)
                      AND MaTK = (SELECT MaTK FROM DON_HANG WHERE MaDH=@maDH)`, { maDH });
      await tx.run('INSERT INTO LICH_SU_DON_HANG (MaDH, MaTrangThai, MaNguoiDoi, GhiChu) VALUES (@maDH, @huy, @userId, @note)',
        { maDH, huy: C.STATUS.HUY, userId, note: note || 'Hủy đơn' });
    });
  },

  /** Xuất danh sách đơn (CSV) theo bộ lọc hiện tại, không phân trang */
  async exportAll(f) {
    const { items } = await this.search(f, { offset: 0, size: 100000 });
    return items;
  }
};
