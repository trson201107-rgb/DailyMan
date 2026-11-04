// [BACKEND A] Model đánh giá sản phẩm (UC10): chỉ khách đã mua và nhận hàng (đơn Hoàn thành) mới được đánh giá
const db = require('../config/db');

module.exports = {
  async canReview(maTK, maSP) {
    const r = await db.query(`SELECT TOP 1 1 AS ok FROM DON_HANG dh JOIN CHI_TIET_DON_HANG ct ON ct.MaDH = dh.MaDH JOIN BIEN_THE bt ON bt.MaBT = ct.MaBT
                              WHERE dh.MaTK = @maTK AND dh.MaTrangThai = 5 AND bt.MaSP = @maSP`, { maTK, maSP });
    return !!r[0];
  },
  async mine(maTK, maSP) { return (await db.query('SELECT SoSao, NoiDung FROM DANH_GIA WHERE MaTK = @maTK AND MaSP = @maSP', { maTK, maSP }))[0]; },
  async save(maTK, maSP, soSao, noiDung) {
    await db.run(`IF EXISTS (SELECT 1 FROM DANH_GIA WHERE MaTK = @maTK AND MaSP = @maSP)
                  BEGIN
                    UPDATE DANH_GIA SET SoSao = @soSao, NoiDung = @noiDung, NgayDG = SYSDATETIME() WHERE MaTK = @maTK AND MaSP = @maSP;
                  END
                  ELSE
                  BEGIN
                    INSERT INTO DANH_GIA (SoSao, NoiDung, MaTK, MaSP) VALUES (@soSao, @noiDung, @maTK, @maSP);
                  END`, { maTK, maSP, soSao, noiDung });
  }
};
