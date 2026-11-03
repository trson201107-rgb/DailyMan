// [BACKEND A] Model sản phẩm: CRUD, tìm kiếm, lọc, sắp xếp, phân trang, ẩn/hiện, xóa vĩnh viễn
const db = require('../config/db');
const C = require('../config/constants');
const { AppError } = require('../utils/errors');
const { likeEsc } = require('../utils/helpers');

// Cột dùng chung: kèm tổng tồn kho suy ra từ BIEN_THE và các cờ Hot/Mới/Sắp hết/Hết hàng
const BASE = `
  FROM SAN_PHAM sp
  JOIN DANH_MUC dm ON dm.MaDM = sp.MaDM
  LEFT JOIN (SELECT MaSP, SUM(SoLuongTon) AS TongTon, COUNT(*) AS SoBienThe FROM BIEN_THE GROUP BY MaSP) t ON t.MaSP = sp.MaSP`;
const COLS = `
  sp.MaSP, sp.TenSP, sp.MoTa, sp.GiaBan, sp.AnhDaiDien, sp.TrangThai, sp.NgayTao, sp.NgayCapNhat, sp.LuotXem, sp.MaDM, dm.TenDM,
  ISNULL(t.TongTon, 0) AS TongTon, ISNULL(t.SoBienThe, 0) AS SoBienThe,
  CASE WHEN sp.LuotXem >= ${C.HOT_MIN_VIEWS} THEN 1 ELSE 0 END AS LaHot,
  CASE WHEN sp.NgayTao >= DATEADD(DAY, -${C.NEW_DAYS}, SYSDATETIME()) THEN 1 ELSE 0 END AS LaMoi`;

// Sắp xếp: chỉ cho phép các khóa trong danh sách trắng (tránh SQL Injection qua ORDER BY)
const SORT_SHOP = {
  moi: 'sp.NgayTao DESC', hot: 'sp.LuotXem DESC, sp.NgayTao DESC', 'gia-tang': 'sp.GiaBan ASC, sp.TenSP', 'gia-giam': 'sp.GiaBan DESC, sp.TenSP',
  ten: 'sp.TenSP ASC', dm: 'dm.TenDM ASC, sp.TenSP ASC'
};
const SORT_ADMIN = {
  'cap-nhat': 'ISNULL(sp.NgayCapNhat, sp.NgayTao) DESC', moi: 'sp.NgayTao DESC', ten: 'sp.TenSP ASC', 'gia-tang': 'sp.GiaBan ASC', 'gia-giam': 'sp.GiaBan DESC',
  dm: 'dm.TenDM ASC, sp.TenSP ASC', 'ton-tang': 'ISNULL(t.TongTon,0) ASC', hot: 'sp.LuotXem DESC'
};

/** Dựng WHERE theo bộ lọc. admin=true: thấy cả sản phẩm ẩn + lọc theo trạng thái/tồn kho */
function buildWhere(f, admin) {
  const w = []; const p = {};
  if (!admin) w.push('sp.TrangThai = @tt'), p.tt = C.SP.BAN;
  if (f.q) {
    p.q = likeEsc(f.q);
    w.push(admin ? `(sp.TenSP LIKE @q OR dm.TenDM LIKE @q OR EXISTS (SELECT 1 FROM BIEN_THE x WHERE x.MaSP = sp.MaSP AND x.SKU LIKE @q))`
                 : `(sp.TenSP LIKE @q OR dm.TenDM LIKE @q)`);
  }
  if (f.dm) { w.push('sp.MaDM = @dm'); p.dm = f.dm; }
  if (f.giaMin != null) { w.push('sp.GiaBan >= @giaMin'); p.giaMin = f.giaMin; }
  if (f.giaMax != null) { w.push('sp.GiaBan <= @giaMax'); p.giaMax = f.giaMax; }
  if (f.mau || f.size || f.conHang) {   // màu + size + còn hàng phải khớp CÙNG một biến thể
    let c = 'EXISTS (SELECT 1 FROM BIEN_THE b WHERE b.MaSP = sp.MaSP';
    if (f.mau) { c += ' AND b.MaMau = @mau'; p.mau = f.mau; }
    if (f.size) { c += ' AND b.MaSize = @size'; p.size = f.size; }
    if (f.conHang) c += ' AND b.SoLuongTon > 0';
    w.push(c + ')');
  }
  if (f.tag === 'hot') w.push(`sp.LuotXem >= ${C.HOT_MIN_VIEWS}`);
  if (f.tag === 'moi') w.push(`sp.NgayTao >= DATEADD(DAY, -${C.NEW_DAYS}, SYSDATETIME())`);
  if (admin) {
    if (f.trangThai === 'dang-ban') w.push('sp.TrangThai = @st'), p.st = C.SP.BAN;
    if (f.trangThai === 'an') w.push('sp.TrangThai = @st'), p.st = C.SP.AN;
    if (f.trangThai === 'sap-het') w.push(`ISNULL(t.TongTon,0) BETWEEN 1 AND ${C.LOW_STOCK}`);
    if (f.trangThai === 'het-hang') w.push('ISNULL(t.TongTon,0) = 0');
  }
  return { where: w.length ? 'WHERE ' + w.join(' AND ') : '', params: p };
}

async function search(f, { offset, size }, admin = false) {
  const { where, params } = buildWhere(f, admin);
  const order = (admin ? SORT_ADMIN : SORT_SHOP)[f.sort] || (admin ? SORT_ADMIN['cap-nhat'] : SORT_SHOP.moi);
  const total = (await db.query(`SELECT COUNT(*) AS n ${BASE} ${where}`, params))[0].n;
  const items = await db.query(
    `SELECT ${COLS} ${BASE} ${where} ORDER BY ${order} OFFSET @off ROWS FETCH NEXT @lim ROWS ONLY`,
    { ...params, off: offset, lim: size });
  return { items, total };
}

const dup = (e) => [2627, 2601].includes(e.number);

module.exports = {
  searchShop: (f, pg) => search(f, pg, false),
  searchAdmin: (f, pg) => search(f, pg, true),

  /** Chi tiết 1 sản phẩm (kèm người tạo / người cập nhật) */
  async findById(id, { onlyActive = false } = {}) {
    const r = await db.query(
      `SELECT ${COLS}, tk1.HoTen AS TenNguoiTao, tk2.HoTen AS TenNguoiCapNhat
       ${BASE}
       LEFT JOIN TAI_KHOAN tk1 ON tk1.MaTK = sp.NguoiTao LEFT JOIN TAI_KHOAN tk2 ON tk2.MaTK = sp.NguoiCapNhat
       WHERE sp.MaSP = @id ${onlyActive ? 'AND sp.TrangThai = @tt' : ''}`, { id, tt: C.SP.BAN });
    return r[0];
  },
  related(maSP, maDM, limit = 4) {
    return db.query(`SELECT TOP (@lim) ${COLS} ${BASE}
                     WHERE sp.MaDM = @maDM AND sp.MaSP <> @maSP AND sp.TrangThai = @tt
                     ORDER BY sp.LuotXem DESC, sp.NgayTao DESC`, { lim: limit, maDM, maSP, tt: C.SP.BAN });
  },
  featured(tag, limit = 4) {   // tag: 'hot' | 'moi' — cho trang chủ
    const order = tag === 'hot' ? 'sp.LuotXem DESC' : 'sp.NgayTao DESC';
    return db.query(`SELECT TOP (@lim) ${COLS} ${BASE} WHERE sp.TrangThai = @tt ORDER BY ${order}`, { lim: limit, tt: C.SP.BAN });
  },
  reviews(maSP) {
    return db.query(`SELECT dg.SoSao, dg.NoiDung, dg.NgayDG, tk.HoTen FROM DANH_GIA dg JOIN TAI_KHOAN tk ON tk.MaTK = dg.MaTK
                     WHERE dg.MaSP = @maSP ORDER BY dg.NgayDG DESC`, { maSP });
  },
  incView(id) { return db.run('UPDATE SAN_PHAM SET LuotXem = LuotXem + 1 WHERE MaSP = @id', { id }); },

  /** Thêm sản phẩm + các biến thể trong MỘT giao dịch */
  async create(p, variants, userId) {
    return db.transaction(async (tx) => {
      const r = await tx.query(
        `INSERT INTO SAN_PHAM (TenSP, MoTa, GiaBan, AnhDaiDien, TrangThai, MaDM, NguoiTao, NguoiCapNhat, NgayCapNhat)
         OUTPUT INSERTED.MaSP
         VALUES (@ten, @moTa, @gia, @anh, @tt, @maDM, @uid, @uid, SYSDATETIME())`,
        { ten: p.ten, moTa: p.moTa, gia: p.gia, anh: p.anh, tt: p.trangThai, maDM: p.maDM, uid: userId });
      const maSP = r[0].MaSP;
      for (const v of variants) {
        const sku = v.sku || `SP${maSP}-M${v.maMau}-S${v.maSize}`;
        try {
          await tx.run(`INSERT INTO BIEN_THE (SKU, SoLuongTon, MaSP, MaMau, MaSize) VALUES (@sku, @ton, @maSP, @maMau, @maSize)`,
            { sku, ton: v.ton, maSP, maMau: v.maMau, maSize: v.maSize });
        } catch (e) {
          if (dup(e)) throw new AppError('SKU hoặc tổ hợp màu + size bị trùng trong danh sách biến thể.');
          throw e;
        }
      }
      return maSP;
    });
  },

  /** Cập nhật thông tin; trả về giá cũ để controller ghi log khi đổi giá */
  async update(id, p, userId) {
    const old = (await db.query('SELECT GiaBan FROM SAN_PHAM WHERE MaSP=@id', { id }))[0];
    if (!old) throw new AppError('Không tìm thấy sản phẩm.', 404);
    await db.run(
      `UPDATE SAN_PHAM SET TenSP=@ten, MoTa=@moTa, GiaBan=@gia, AnhDaiDien=@anh, MaDM=@maDM,
              NgayCapNhat=SYSDATETIME(), NguoiCapNhat=@uid WHERE MaSP=@id`,
      { id, ten: p.ten, moTa: p.moTa, gia: p.gia, anh: p.anh, maDM: p.maDM, uid: userId });
    return old.GiaBan;
  },

  /** Ẩn (Ngừng bán, status 0) */
  async hide(id, userId) {
    await db.run(`UPDATE SAN_PHAM SET TrangThai=@tt, NgayCapNhat=SYSDATETIME(), NguoiCapNhat=@uid WHERE MaSP=@id`,
      { id, tt: C.SP.AN, uid: userId });
  },
  /** Hiện lại (Đang bán, status 1) — yêu cầu giá > 0 và có ít nhất 1 biến thể (mục 5.8.1) */
  async show(id, userId) {
    const sp = (await db.query(`SELECT sp.GiaBan, (SELECT COUNT(*) FROM BIEN_THE WHERE MaSP = sp.MaSP) AS n FROM SAN_PHAM sp WHERE sp.MaSP=@id`, { id }))[0];
    if (!sp) throw new AppError('Không tìm thấy sản phẩm.', 404);
    if (!(sp.GiaBan > 0) || sp.n < 1) throw new AppError('Chỉ hiển thị lại khi sản phẩm có giá > 0 và có ít nhất một biến thể.');
    await db.run(`UPDATE SAN_PHAM SET TrangThai=@tt, NgayCapNhat=SYSDATETIME(), NguoiCapNhat=@uid WHERE MaSP=@id`,
      { id, tt: C.SP.BAN, uid: userId });
  },
  /** Xóa vĩnh viễn (Remove): chỉ khi đang ẩn và chưa nằm trong đơn hàng nào */
  async remove(id) {
    const sp = (await db.query('SELECT TrangThai FROM SAN_PHAM WHERE MaSP=@id', { id }))[0];
    if (!sp) throw new AppError('Không tìm thấy sản phẩm.', 404);
    if (sp.TrangThai !== C.SP.AN) throw new AppError('Hãy ẩn sản phẩm trước, sau đó mới xóa vĩnh viễn.');
    const used = (await db.query(`SELECT COUNT(*) AS n FROM CHI_TIET_DON_HANG ct JOIN BIEN_THE bt ON bt.MaBT = ct.MaBT WHERE bt.MaSP=@id`, { id }))[0].n;
    if (used > 0) throw new AppError('Sản phẩm đã có trong đơn hàng nên chỉ được ẩn (ngừng bán), không thể xóa vĩnh viễn.');
    await db.transaction(async (tx) => {
      await tx.run('DELETE FROM CHI_TIET_GIO_HANG WHERE MaBT IN (SELECT MaBT FROM BIEN_THE WHERE MaSP=@id)', { id });
      await tx.run('DELETE FROM DANH_GIA WHERE MaSP=@id', { id });
      await tx.run('DELETE FROM BIEN_THE WHERE MaSP=@id', { id });
      await tx.run('DELETE FROM SAN_PHAM WHERE MaSP=@id', { id });
    });
  },
  /** Đếm nhanh cho thẻ thống kê trang quản lý sản phẩm */
  async counts() {
    return (await db.query(`
      SELECT COUNT(*) AS Tong,
             SUM(CASE WHEN sp.TrangThai = N'Đang bán' THEN 1 ELSE 0 END) AS DangBan,
             SUM(CASE WHEN ISNULL(t.TongTon,0) BETWEEN 1 AND ${C.LOW_STOCK} THEN 1 ELSE 0 END) AS SapHet,
             SUM(CASE WHEN ISNULL(t.TongTon,0) = 0 THEN 1 ELSE 0 END) AS HetHang
      ${BASE}`))[0];
  }
};
