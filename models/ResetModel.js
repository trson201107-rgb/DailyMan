// [BACKEND B] Model đặt lại mật khẩu (token lưu dạng băm SHA-256, dùng một lần, có thời hạn)
const db = require('../config/db');
const { AppError } = require('../utils/errors');

module.exports = {
  async create(maTK, tokenHash, minutes) {
    await db.transaction(async (tx) => {
      await tx.run('UPDATE DAT_LAI_MAT_KHAU SET DaDung = 1 WHERE MaTK = @maTK AND DaDung = 0', { maTK });   // vô hiệu liên kết cũ
      await tx.run('INSERT INTO DAT_LAI_MAT_KHAU (MaTK, TokenHash, HetHan) VALUES (@maTK, @tokenHash, DATEADD(MINUTE, @minutes, SYSDATETIME()))', { maTK, tokenHash, minutes });
    });
  },
  async find(tokenHash) {
    return (await db.query(
      `SELECT dl.MaDL, dl.MaTK, tk.Email, tk.HoTen,
              CASE WHEN dl.DaDung = 0 AND dl.HetHan > SYSDATETIME() THEN 1 ELSE 0 END AS ConHieuLuc
       FROM DAT_LAI_MAT_KHAU dl JOIN TAI_KHOAN tk ON tk.MaTK = dl.MaTK WHERE dl.TokenHash = @tokenHash`, { tokenHash }))[0];
  },
  /** Đặt mật khẩu mới: đánh dấu token đã dùng + cập nhật mật khẩu + mở khóa, trong một giao dịch */
  async consume(tokenHash, passwordHash) {
    return db.transaction(async (tx) => {
      const u = await tx.run('UPDATE DAT_LAI_MAT_KHAU SET DaDung = 1 WHERE TokenHash = @tokenHash AND DaDung = 0 AND HetHan > SYSDATETIME()', { tokenHash });
      if (!u.rowsAffected[0]) throw new AppError('Liên kết đặt lại mật khẩu đã hết hiệu lực. Vui lòng yêu cầu gửi lại.');
      const r = await tx.query('SELECT MaTK FROM DAT_LAI_MAT_KHAU WHERE TokenHash = @tokenHash', { tokenHash });
      await tx.run('UPDATE TAI_KHOAN SET MatKhauHash = @passwordHash, SoLanDangNhapSai = 0, KhoaDen = NULL WHERE MaTK = @maTK', { passwordHash, maTK: r[0].MaTK });
      return r[0].MaTK;
    });
  }
};
