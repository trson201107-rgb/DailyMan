// [BACKEND A] Model biến thể (sản phẩm + màu + size) và tồn kho
const db = require('../config/db');
const { AppError } = require('../utils/errors');

const dup = (e) => [2627, 2601].includes(e.number);

module.exports = {
  colors() { return db.query('SELECT MaMau, TenMau, MaHex FROM MAU_SAC ORDER BY MaMau'); },
  sizes() { return db.query('SELECT MaSize, TenSize FROM KICH_CO ORDER BY ThuTu'); },

  byProduct(maSP) {
    return db.query(`SELECT bt.MaBT, bt.SKU, bt.SoLuongTon, bt.MaMau, ms.TenMau, ms.MaHex, bt.MaSize, kc.TenSize
                     FROM BIEN_THE bt JOIN MAU_SAC ms ON ms.MaMau = bt.MaMau JOIN KICH_CO kc ON kc.MaSize = bt.MaSize
                     WHERE bt.MaSP = @maSP ORDER BY ms.MaMau, kc.ThuTu`, { maSP });
  },
  async findById(maBT) {
    return (await db.query(`SELECT bt.*, sp.TenSP FROM BIEN_THE bt JOIN SAN_PHAM sp ON sp.MaSP = bt.MaSP WHERE bt.MaBT=@maBT`, { maBT }))[0];
  },
  async add(maSP, { sku, ton, maMau, maSize }) {
    try {
      await db.run(`INSERT INTO BIEN_THE (SKU, SoLuongTon, MaSP, MaMau, MaSize) VALUES (@sku, @ton, @maSP, @maMau, @maSize)`,
        { sku, ton, maSP, maMau, maSize });
    } catch (e) {
      if (dup(e)) throw new AppError('Biến thể (màu + size) hoặc SKU đã tồn tại trong sản phẩm này.');
      throw e;
    }
  },
  /** Điều chỉnh tồn kho (Staff + Admin). Trả về số cũ để ghi log */
  async setStock(maBT, ton) {
    const old = (await db.query('SELECT SoLuongTon FROM BIEN_THE WHERE MaBT=@maBT', { maBT }))[0];
    if (!old) throw new AppError('Không tìm thấy biến thể.', 404);
    await db.run('UPDATE BIEN_THE SET SoLuongTon=@ton WHERE MaBT=@maBT', { maBT, ton });
    return old.SoLuongTon;
  },
  async remove(maBT) {
    const used = (await db.query('SELECT COUNT(*) AS n FROM CHI_TIET_DON_HANG WHERE MaBT=@maBT', { maBT }))[0].n;
    if (used > 0) throw new AppError('Biến thể đã có trong đơn hàng, không thể xóa (hãy đặt tồn kho = 0 hoặc ẩn sản phẩm).');
    await db.transaction(async (tx) => {
      await tx.run('DELETE FROM CHI_TIET_GIO_HANG WHERE MaBT=@maBT', { maBT });
      await tx.run('DELETE FROM BIEN_THE WHERE MaBT=@maBT', { maBT });
    });
  }
};
