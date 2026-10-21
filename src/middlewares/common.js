// Middleware dùng chung: biến cho view (user, flash, giỏ hàng, hàm tiện ích)
const helpers = require('../utils/helpers');
const CartModel = require('../models/CartModel');

function locals(req, res, next) {
  res.locals.user = req.session.user || null;
  res.locals.path = req.path;
  res.locals.h = helpers;
  res.locals.flash = req.session.flash || null;
  if (req.session.flash) req.session.flash = null;
  res.locals.cartCount = 0;
  // Tạo URL giữ nguyên query hiện tại, chỉ đổi một vài tham số (dùng cho phân trang, tab, sắp xếp)
  res.locals.urlWith = (over = {}) => {
    const q = { ...req.query, ...over };
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(q)) if (v !== '' && v !== undefined && v !== null) sp.set(k, v);
    const s = sp.toString();
    return req.baseUrl + req.path + (s ? '?' + s : '');
  };
  next();
}

async function cartBadge(req, res, next) {
  try { res.locals.cartCount = await CartModel.countItems(req.session); } catch (_) { res.locals.cartCount = 0; }
  next();
}

const flash = (req, type, msg) => { req.session.flash = { type, msg }; };

module.exports = { locals, cartBadge, flash };
