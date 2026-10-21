// [BACKEND B] Model voucher / ví voucher
const db = require('../config/db');
const { AppError } = require('../utils/errors');
const { money } = require('../utils/helpers');

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
  }
};
