// [BACKEND A] Model ảnh sản phẩm (nhiều ảnh: URL hoặc tải lên lưu trong CSDL)
const db = require('../config/db');
const C = require('../config/constants');
const { AppError } = require('../utils/errors');

module.exports = {
  list(maSP) { return db.query('SELECT MaAnh, DuongDan, LoaiAnh, ThuTu, CASE WHEN DuLieu IS NULL THEN 0 ELSE 1 END AS TaiLen FROM ANH_SAN_PHAM WHERE MaSP = @maSP ORDER BY ThuTu, MaAnh', { maSP }); },
  async data(maAnh) { return (await db.query('SELECT DuLieu, LoaiAnh, DuongDan FROM ANH_SAN_PHAM WHERE MaAnh = @maAnh', { maAnh }))[0]; },
  async _guard(maSP) {
    const n = (await db.query('SELECT COUNT(*) AS n FROM ANH_SAN_PHAM WHERE MaSP = @maSP', { maSP }))[0].n;
    if (n >= C.MAX_IMAGES) throw new AppError(`Mỗi sản phẩm tối đa ${C.MAX_IMAGES} ảnh.`);
    return n;
  },
  async addUrl(maSP, url) {
    const n = await this._guard(maSP);
    await db.run('INSERT INTO ANH_SAN_PHAM (MaSP, DuongDan, ThuTu) VALUES (@maSP, @url, @n)', { maSP, url, n });
  },
  async addFile(maSP, buffer, mime) {
    const n = await this._guard(maSP);
    await db.run('INSERT INTO ANH_SAN_PHAM (MaSP, DuLieu, LoaiAnh, ThuTu) VALUES (@maSP, @buffer, @mime, @n)', { maSP, buffer, mime, n });
  },
  async remove(maAnh, maSP) { await db.run('DELETE FROM ANH_SAN_PHAM WHERE MaAnh = @maAnh AND MaSP = @maSP', { maAnh, maSP }); },
  async setMain(maAnh, maSP) {
    await db.transaction(async (tx) => {
      await tx.run('UPDATE ANH_SAN_PHAM SET ThuTu = ThuTu + 1 WHERE MaSP = @maSP', { maSP });
      await tx.run('UPDATE ANH_SAN_PHAM SET ThuTu = 0 WHERE MaAnh = @maAnh AND MaSP = @maSP', { maAnh, maSP });
    });
  }
};
