// [BACKEND B] Model giỏ hàng: khách vãng lai lưu trong cookie phiên (session.cart), khách đã đăng nhập lưu trong DB
const db = require('../config/db');
const C = require('../config/constants');
const { AppError } = require('../utils/errors');

const LINE_COLS = `bt.MaBT, bt.SKU, bt.SoLuongTon AS Ton, sp.MaSP, sp.TenSP, sp.GiaBan, sp.AnhDaiDien, sp.MaDM, sp.TrangThai,
                   ms.TenMau, kc.TenSize`;
const LINE_JOIN = `JOIN SAN_PHAM sp ON sp.MaSP = bt.MaSP JOIN MAU_SAC ms ON ms.MaMau = bt.MaMau JOIN KICH_CO kc ON kc.MaSize = bt.MaSize`;

function decorate(row, qty) {
  const l = { ...row, SoLuong: qty };
  l.HetHang = row.TrangThai !== C.SP.BAN || row.Ton < 1;       // hết hàng / ngừng bán: không tính vào tổng
  l.VuotTon = !l.HetHang && qty > row.Ton;
  l.ThanhTien = l.HetHang ? 0 : row.GiaBan * qty;
  return l;
}

async function ensureCart(maTK) {
  const r = await db.query('SELECT MaGH FROM GIO_HANG WHERE MaTK=@maTK', { maTK });
  if (r[0]) return r[0].MaGH;
  return (await db.query('INSERT INTO GIO_HANG (MaTK) OUTPUT INSERTED.MaGH VALUES (@maTK)', { maTK }))[0].MaGH;
}
async function getVariant(maBT) {
  return (await db.query(`SELECT ${LINE_COLS} FROM BIEN_THE bt ${LINE_JOIN} WHERE bt.MaBT=@maBT`, { maBT }))[0];
}
async function currentQty(session, maBT) {
  if (session.user) {
    const r = await db.query(`SELECT ct.SoLuong FROM CHI_TIET_GIO_HANG ct JOIN GIO_HANG g ON g.MaGH=ct.MaGH WHERE g.MaTK=@u AND ct.MaBT=@maBT`, { u: session.user.id, maBT });
    return r[0] ? r[0].SoLuong : 0;
  }
  const l = (session.cart || []).find((x) => x.b === maBT);
  return l ? l.q : 0;
}
async function writeQty(session, maBT, qty) {
  if (session.user) {
    const maGH = await ensureCart(session.user.id);
    await db.run(`IF EXISTS (SELECT 1 FROM CHI_TIET_GIO_HANG WHERE MaGH=@maGH AND MaBT=@maBT)
                    UPDATE CHI_TIET_GIO_HANG SET SoLuong=@qty WHERE MaGH=@maGH AND MaBT=@maBT
                  ELSE INSERT INTO CHI_TIET_GIO_HANG (MaGH, MaBT, SoLuong) VALUES (@maGH, @maBT, @qty);
                  UPDATE GIO_HANG SET NgayCapNhat = SYSDATETIME() WHERE MaGH=@maGH`, { maGH, maBT, qty });
  } else {
    const cart = (session.cart || []).filter((x) => x.b !== maBT);
    cart.push({ b: maBT, q: qty });
    session.cart = cart;
  }
}

module.exports = {
  async countItems(session) {
    if (session.user) {
      return (await db.query(`SELECT ISNULL(SUM(ct.SoLuong),0) AS n FROM CHI_TIET_GIO_HANG ct JOIN GIO_HANG g ON g.MaGH=ct.MaGH WHERE g.MaTK=@u`, { u: session.user.id }))[0].n;
    }
    return (session.cart || []).reduce((s, x) => s + x.q, 0);
  },

  /** Các dòng trong giỏ + tổng tiền hàng */
  async items(session) {
    let lines = [];
    if (session.user) {
      const rows = await db.query(`SELECT ${LINE_COLS}, ct.SoLuong AS Qty FROM CHI_TIET_GIO_HANG ct JOIN GIO_HANG g ON g.MaGH = ct.MaGH
                                   JOIN BIEN_THE bt ON bt.MaBT = ct.MaBT ${LINE_JOIN} WHERE g.MaTK=@u ORDER BY ct.MaBT`, { u: session.user.id });
      lines = rows.map((r) => decorate(r, r.Qty));
    } else if ((session.cart || []).length) {
      const ids = session.cart.map((x) => x.b); const p = {};
      const ph = ids.map((id, i) => { p['b' + i] = id; return '@b' + i; }).join(',');
      const rows = await db.query(`SELECT ${LINE_COLS} FROM BIEN_THE bt ${LINE_JOIN} WHERE bt.MaBT IN (${ph})`, p);
      lines = rows.map((r) => decorate(r, session.cart.find((x) => x.b === r.MaBT).q));
    }
    const tienHang = lines.reduce((s, l) => s + l.ThanhTien, 0);
    return { lines, tienHang };
  },

  /** Tìm biến thể theo sản phẩm + màu + size (bắt buộc chọn đủ) */
  async resolve(maSP, maMau, maSize) {
    if (!maMau || !maSize) throw new AppError('Vui lòng chọn đủ màu và size.');
    const r = await db.query('SELECT MaBT FROM BIEN_THE WHERE MaSP=@maSP AND MaMau=@maMau AND MaSize=@maSize', { maSP, maMau, maSize });
    if (!r[0]) throw new AppError('Biến thể này không tồn tại.');
    return r[0].MaBT;
  },

  async add(session, maBT, qty) {
    if (!Number.isInteger(qty) || qty < 1) throw new AppError('Số lượng phải là số nguyên >= 1.');
    const v = await getVariant(maBT);
    if (!v || v.TrangThai !== C.SP.BAN) throw new AppError('Sản phẩm không tồn tại hoặc đã ngừng bán.');
    if (v.Ton < 1) throw new AppError('Biến thể này đã hết hàng.');
    const have = await currentQty(session, maBT);
    if (have + qty > v.Ton) throw new AppError(`Chỉ còn ${v.Ton} sản phẩm (trong giỏ đã có ${have}).`);
    await writeQty(session, maBT, have + qty);          // cùng biến thể => cộng dồn
  },
  async setQty(session, maBT, qty) {
    if (!Number.isInteger(qty) || qty < 1) throw new AppError('Số lượng phải là số nguyên >= 1.');
    const v = await getVariant(maBT);
    if (!v) throw new AppError('Sản phẩm không tồn tại.');
    if (qty > v.Ton) throw new AppError(`Chỉ còn ${v.Ton} sản phẩm trong kho, giữ nguyên số lượng cũ.`);
    if ((await currentQty(session, maBT)) === 0) throw new AppError('Sản phẩm không có trong giỏ.');
    await writeQty(session, maBT, qty);
  },
  async remove(session, maBT) {
    if (session.user) {
      await db.run(`DELETE ct FROM CHI_TIET_GIO_HANG ct JOIN GIO_HANG g ON g.MaGH=ct.MaGH WHERE g.MaTK=@u AND ct.MaBT=@maBT`, { u: session.user.id, maBT });
    } else session.cart = (session.cart || []).filter((x) => x.b !== maBT);
  },

  /** Gộp giỏ tạm của khách vào giỏ tài khoản khi đăng nhập / đăng ký (không làm mất sản phẩm) */
  async merge(session, maTK) {
    const guest = session.cart || [];
    if (!guest.length) return;
    for (const g of guest) {
      try {
        const v = await getVariant(g.b);
        if (!v || v.TrangThai !== C.SP.BAN || v.Ton < 1) continue;
        const r = await db.query(`SELECT ct.SoLuong FROM CHI_TIET_GIO_HANG ct JOIN GIO_HANG gh ON gh.MaGH=ct.MaGH WHERE gh.MaTK=@u AND ct.MaBT=@b`, { u: maTK, b: g.b });
        const qty = Math.min(v.Ton, (r[0] ? r[0].SoLuong : 0) + g.q);
        const maGH = await ensureCart(maTK);
        await db.run(`IF EXISTS (SELECT 1 FROM CHI_TIET_GIO_HANG WHERE MaGH=@maGH AND MaBT=@maBT)
                        UPDATE CHI_TIET_GIO_HANG SET SoLuong=@qty WHERE MaGH=@maGH AND MaBT=@maBT
                      ELSE INSERT INTO CHI_TIET_GIO_HANG (MaGH, MaBT, SoLuong) VALUES (@maGH, @maBT, @qty)`, { maGH, maBT: g.b, qty });
      } catch (_) { /* bỏ qua dòng lỗi, không làm hỏng đăng nhập */ }
    }
    session.cart = [];
  }
};
