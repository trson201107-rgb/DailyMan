// [BACKEND B] Model đổi trả (UC09 gửi yêu cầu, UC13 xử lý): chỉ đơn Hoàn thành, trong thời hạn, lý do bắt buộc; từ chối phải có lý do
const db = require('../config/db');
const C = require('../config/constants');
const TierModel = require('./TierModel');
const { AppError } = require('../utils/errors');
const { likeEsc } = require('../utils/helpers');

module.exports = {
  async byOrder(maDH) { return (await db.query('SELECT TOP 1 * FROM YEU_CAU_DOI_TRA WHERE MaDH = @maDH ORDER BY MaYC DESC', { maDH }))[0]; },

  /** Khách gửi yêu cầu đổi trả */
  async create(maTK, maDH, lyDo) {
    return db.transaction(async (tx) => {
      const o = (await tx.query(
        `SELECT dh.MaTrangThai,
                DATEDIFF(DAY, (SELECT MIN(ls.ThoiGian) FROM LICH_SU_DON_HANG ls WHERE ls.MaDH = dh.MaDH AND ls.MaTrangThai = 5), SYSDATETIME()) AS SoNgay
         FROM DON_HANG dh WITH (UPDLOCK) WHERE dh.MaDH = @maDH AND dh.MaTK = @maTK`, { maDH, maTK }))[0];
      if (!o) throw new AppError('Không tìm thấy đơn hàng.', 404);
      if (o.MaTrangThai !== C.STATUS.HOAN_THANH) throw new AppError('Không thể đổi trả: chỉ đơn hàng đã Hoàn thành mới được gửi yêu cầu đổi trả.');
      if (o.SoNgay !== null && o.SoNgay > C.RETURN_DAYS) throw new AppError(`Không thể đổi trả: đã quá ${C.RETURN_DAYS} ngày kể từ khi đơn hoàn thành.`);
      const ex = await tx.query(`SELECT 1 AS x FROM YEU_CAU_DOI_TRA WHERE MaDH = @maDH AND TrangThai <> @no`, { maDH, no: C.RETURN.NO });
      if (ex[0]) throw new AppError('Đơn hàng này đã có yêu cầu đổi trả.');
      const r = await tx.query('INSERT INTO YEU_CAU_DOI_TRA (MaDH, MaTK, LyDo) OUTPUT INSERTED.MaYC VALUES (@maDH, @maTK, @lyDo)', { maDH, maTK, lyDo });
      return r[0].MaYC;
    });
  },

  /** Danh sách yêu cầu (nhân viên) */
  async search({ status, q }, { offset, size }) {
    const w = []; const p = {};
    if (status) { w.push('yc.TrangThai = @status'); p.status = status; }
    if (q) { const n = /^\d+$/.test(q) ? parseInt(q, 10) : null; w.push(`(tk.HoTen LIKE @q OR tk.Email LIKE @q ${n ? 'OR yc.MaDH = @ma OR yc.MaYC = @ma' : ''})`); p.q = likeEsc(q); if (n) p.ma = n; }
    const where = w.length ? 'WHERE ' + w.join(' AND ') : '';
    const from = `FROM YEU_CAU_DOI_TRA yc JOIN TAI_KHOAN tk ON tk.MaTK = yc.MaTK JOIN DON_HANG dh ON dh.MaDH = yc.MaDH
                  JOIN vw_TongTienDonHang v ON v.MaDH = dh.MaDH LEFT JOIN TAI_KHOAN nv ON nv.MaTK = yc.MaNguoiXuLy ${where}`;
    const total = (await db.query(`SELECT COUNT(*) AS n ${from}`, p))[0].n;
    const items = await db.query(`SELECT yc.MaYC, yc.MaDH, yc.LyDo, yc.TrangThai, yc.LyDoTuChoi, yc.NgayTao, yc.NgayXuLy, tk.HoTen, tk.Email, v.TongThanhToan, nv.HoTen AS NguoiXuLy
                                  ${from} ORDER BY CASE WHEN yc.TrangThai = @cho THEN 0 ELSE 1 END, yc.NgayTao DESC OFFSET @off ROWS FETCH NEXT @lim ROWS ONLY`,
      { ...p, cho: C.RETURN.CHO, off: offset, lim: size });
    return { items, total };
  },
  async counts() {
    const r = await db.query('SELECT TrangThai, COUNT(*) AS n FROM YEU_CAU_DOI_TRA GROUP BY TrangThai');
    const m = { all: 0 }; r.forEach((x) => { m[x.TrangThai] = x.n; m.all += x.n; }); return m;
  },
  async pendingCount() { return (await db.query('SELECT COUNT(*) AS n FROM YEU_CAU_DOI_TRA WHERE TrangThai = @cho', { cho: C.RETURN.CHO }))[0].n; },

  /** Chấp nhận: ghi nhận đổi trả, đơn chuyển sang trạng thái Đổi trả, ghi nhật ký */
  async accept(maYC, userId) {
    return db.transaction(async (tx) => {
      const u = await tx.run(`UPDATE YEU_CAU_DOI_TRA SET TrangThai = @ok, NgayXuLy = SYSDATETIME(), MaNguoiXuLy = @userId WHERE MaYC = @maYC AND TrangThai = @cho`,
        { maYC, userId, ok: C.RETURN.OK, cho: C.RETURN.CHO });
      if (!u.rowsAffected[0]) throw new AppError('Yêu cầu không còn ở trạng thái chờ xử lý.');
      const r = (await tx.query('SELECT MaDH, MaTK FROM YEU_CAU_DOI_TRA WHERE MaYC = @maYC', { maYC }))[0];
      const o = await tx.run('UPDATE DON_HANG SET MaTrangThai = @dt WHERE MaDH = @maDH AND MaTrangThai = @ht', { dt: C.STATUS.DOI_TRA, maDH: r.MaDH, ht: C.STATUS.HOAN_THANH });
      if (!o.rowsAffected[0]) throw new AppError('Đơn hàng không còn ở trạng thái Hoàn thành.');
      await tx.run('INSERT INTO LICH_SU_DON_HANG (MaDH, MaTrangThai, MaNguoiDoi, GhiChu) VALUES (@maDH, @dt, @userId, @note)',
        { maDH: r.MaDH, dt: C.STATUS.DOI_TRA, userId, note: `Chấp nhận yêu cầu đổi trả #${maYC}` });
      await tx.run(TierModel.recomputeSql('AND tk.MaTK = @maTK'), { maTK: r.MaTK });
      return r.MaDH;
    });
  },
  /** Từ chối: bắt buộc có lý do, lưu lý do và ghi nhật ký */
  async reject(maYC, userId, lyDo) {
    if (!lyDo) throw new AppError('Vui lòng nhập lý do từ chối.');
    return db.transaction(async (tx) => {
      const u = await tx.run(`UPDATE YEU_CAU_DOI_TRA SET TrangThai = @no, LyDoTuChoi = @lyDo, NgayXuLy = SYSDATETIME(), MaNguoiXuLy = @userId WHERE MaYC = @maYC AND TrangThai = @cho`,
        { maYC, userId, lyDo, no: C.RETURN.NO, cho: C.RETURN.CHO });
      if (!u.rowsAffected[0]) throw new AppError('Yêu cầu không còn ở trạng thái chờ xử lý.');
      const r = (await tx.query('SELECT yc.MaDH, dh.MaTrangThai FROM YEU_CAU_DOI_TRA yc JOIN DON_HANG dh ON dh.MaDH = yc.MaDH WHERE yc.MaYC = @maYC', { maYC }))[0];
      await tx.run('INSERT INTO LICH_SU_DON_HANG (MaDH, MaTrangThai, MaNguoiDoi, GhiChu) VALUES (@maDH, @st, @userId, @note)',
        { maDH: r.MaDH, st: r.MaTrangThai, userId, note: `Từ chối đổi trả #${maYC}: ${lyDo}`.slice(0, 255) });
      return r.MaDH;
    });
  }
};
