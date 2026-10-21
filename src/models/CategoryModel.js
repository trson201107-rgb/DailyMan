// [BACKEND A] Model danh mục
const db = require('../config/db');
const { AppError } = require('../utils/errors');

module.exports = {
  list() {
    return db.query(`SELECT dm.MaDM, dm.TenDM, dm.MoTa, COUNT(sp.MaSP) AS SoSanPham
                     FROM DANH_MUC dm LEFT JOIN SAN_PHAM sp ON sp.MaDM = dm.MaDM
                     GROUP BY dm.MaDM, dm.TenDM, dm.MoTa ORDER BY dm.MaDM`);
  },
  async findById(id) { return (await db.query('SELECT * FROM DANH_MUC WHERE MaDM=@id', { id }))[0]; },
  async create({ ten, moTa }) {
    try { await db.run('INSERT INTO DANH_MUC (TenDM, MoTa) VALUES (@ten, @moTa)', { ten, moTa }); }
    catch (e) { if ([2627, 2601].includes(e.number)) throw new AppError('Tên danh mục đã tồn tại.'); throw e; }
  },
  async update(id, { ten, moTa }) {
    try { await db.run('UPDATE DANH_MUC SET TenDM=@ten, MoTa=@moTa WHERE MaDM=@id', { id, ten, moTa }); }
    catch (e) { if ([2627, 2601].includes(e.number)) throw new AppError('Tên danh mục đã tồn tại.'); throw e; }
  },
  async remove(id) {
    const n = (await db.query('SELECT COUNT(*) AS n FROM SAN_PHAM WHERE MaDM=@id', { id }))[0].n;
    if (n > 0) throw new AppError('Không thể xóa: danh mục đang có sản phẩm. Hãy chuyển sản phẩm sang danh mục khác trước.');
    await db.run('DELETE FROM DANH_MUC WHERE MaDM=@id', { id });
  }
};
