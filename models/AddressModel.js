// [BACKEND B] Model sổ địa chỉ giao hàng của khách
const db = require('../config/db');
const { AppError } = require('../utils/errors');

module.exports = {
  list(maTK) { return db.query('SELECT * FROM DIA_CHI WHERE MaTK = @maTK ORDER BY MacDinh DESC, MaDC', { maTK }); },
  async find(maDC, maTK) { return (await db.query('SELECT * FROM DIA_CHI WHERE MaDC = @maDC AND MaTK = @maTK', { maDC, maTK }))[0]; },
  /** Chuỗi địa chỉ lưu vào đơn hàng (DiaChiGiao) */
  format(a) { return `${a.DiaChiCuThe}, ${a.QuanHuyen}, ${a.TinhThanh}`; },
  async create(maTK, a, macDinh = false) {
    const n = (await db.query('SELECT COUNT(*) AS n FROM DIA_CHI WHERE MaTK = @maTK', { maTK }))[0].n;
    if (n >= 10) throw new AppError('Mỗi tài khoản lưu tối đa 10 địa chỉ.');
    return db.transaction(async (tx) => {
      const def = macDinh || n === 0;
      if (def) await tx.run('UPDATE DIA_CHI SET MacDinh = 0 WHERE MaTK = @maTK', { maTK });
      const r = await tx.query(`INSERT INTO DIA_CHI (MaTK, TenNguoiNhan, SDT, TinhThanh, QuanHuyen, DiaChiCuThe, MacDinh) OUTPUT INSERTED.MaDC
                                VALUES (@maTK, @ten, @sdt, @tinh, @quan, @cuThe, @def)`,
        { maTK, ten: a.ten, sdt: a.sdt, tinh: a.tinh, quan: a.quan, cuThe: a.cuThe, def: def ? 1 : 0 });
      return r[0].MaDC;
    });
  },
  async update(maDC, maTK, a, macDinh = false) {
    await db.transaction(async (tx) => {
      const u = await tx.run(`UPDATE DIA_CHI SET TenNguoiNhan=@ten, SDT=@sdt, TinhThanh=@tinh, QuanHuyen=@quan, DiaChiCuThe=@cuThe WHERE MaDC=@maDC AND MaTK=@maTK`,
        { maDC, maTK, ten: a.ten, sdt: a.sdt, tinh: a.tinh, quan: a.quan, cuThe: a.cuThe });
      if (!u.rowsAffected[0]) throw new AppError('Không tìm thấy địa chỉ.', 404);
      if (macDinh) {
        await tx.run('UPDATE DIA_CHI SET MacDinh = 0 WHERE MaTK = @maTK', { maTK });
        await tx.run('UPDATE DIA_CHI SET MacDinh = 1 WHERE MaDC = @maDC AND MaTK = @maTK', { maDC, maTK });
      }
    });
  },
  async setDefault(maDC, maTK) {
    await db.transaction(async (tx) => {
      const r = await tx.query('SELECT MaDC FROM DIA_CHI WHERE MaDC = @maDC AND MaTK = @maTK', { maDC, maTK });
      if (!r[0]) throw new AppError('Không tìm thấy địa chỉ.', 404);
      await tx.run('UPDATE DIA_CHI SET MacDinh = 0 WHERE MaTK = @maTK', { maTK });
      await tx.run('UPDATE DIA_CHI SET MacDinh = 1 WHERE MaDC = @maDC', { maDC });
    });
  },
  async remove(maDC, maTK) {
    await db.transaction(async (tx) => {
      const r = await tx.query('SELECT MacDinh FROM DIA_CHI WHERE MaDC = @maDC AND MaTK = @maTK', { maDC, maTK });
      if (!r[0]) throw new AppError('Không tìm thấy địa chỉ.', 404);
      await tx.run('DELETE FROM DIA_CHI WHERE MaDC = @maDC AND MaTK = @maTK', { maDC, maTK });
      if (r[0].MacDinh) await tx.run('UPDATE DIA_CHI SET MacDinh = 1 WHERE MaDC = (SELECT TOP 1 MaDC FROM DIA_CHI WHERE MaTK = @maTK ORDER BY MaDC)', { maTK });
    });
  }
};
