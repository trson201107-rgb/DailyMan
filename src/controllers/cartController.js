// [BACKEND B] Giỏ hàng + mã giảm giá
const CartModel = require('../models/CartModel');
const VoucherModel = require('../models/VoucherModel');
const OrderModel = require('../models/OrderModel');
const db = require('../config/db');
const { toInt } = require('../utils/helpers');
const { userError } = require('../utils/errors');
const { flash } = require('../middlewares/common');

/** Tính tiền giỏ: tạm tính, phí ship, giảm giá (nếu mã còn hợp lệ), tổng. Dùng chung cho trang giỏ và trang thanh toán */
exports.summarize = async (req) => {
  const { lines, tienHang } = await CartModel.items(req.session);
  let giam = 0; let voucher = null;
  if (req.session.voucher && req.session.user && tienHang > 0) {
    try { const r = await VoucherModel.check(db, req.session.voucher, req.session.user.id, tienHang); voucher = r.voucher; giam = r.giam; }
    catch (e) { flash(req, 'error', 'Mã ' + req.session.voucher + ' không còn áp dụng được: ' + e.message); req.session.voucher = null; }
  }
  const phi = tienHang > 0 ? OrderModel.shipFee(tienHang) : 0;
  return { lines, tienHang, giam, voucher, phi, tong: tienHang + phi - giam };
};

exports.view = async (req, res) => {
  const s = await exports.summarize(req);
  const wallet = req.session.user ? await VoucherModel.wallet(req.session.user.id) : [];
  res.render('shop/cart', { title: 'Giỏ hàng', ...s, wallet, code: req.session.voucher || '' });
};

exports.add = async (req, res) => {
  const maSP = toInt(req.body.maSP); const back = '/san-pham/' + maSP;
  try {
    const maBT = await CartModel.resolve(maSP, toInt(req.body.maMau), toInt(req.body.maSize));
    await CartModel.add(req.session, maBT, toInt(req.body.soLuong, 1));
    if (req.body.mua === '1') return res.redirect('/thanh-toan');
    flash(req, 'success', 'Đã thêm vào giỏ hàng.');
    res.redirect('/gio-hang');
  } catch (e) { userError(req, res, e, back); }
};
exports.update = async (req, res) => {
  try { await CartModel.setQty(req.session, toInt(req.body.maBT), toInt(req.body.soLuong)); res.redirect('/gio-hang'); }
  catch (e) { userError(req, res, e, '/gio-hang'); }
};
exports.remove = async (req, res) => { await CartModel.remove(req.session, toInt(req.body.maBT)); res.redirect('/gio-hang'); };

exports.applyVoucher = async (req, res) => {
  if (!req.session.user) { req.session.next = '/gio-hang'; flash(req, 'error', 'Vui lòng đăng nhập để dùng mã giảm giá.'); return res.redirect('/dang-nhap'); }
  const code = String(req.body.code || '').trim().toUpperCase();
  if (!code) { flash(req, 'error', 'Vui lòng nhập hoặc chọn mã giảm giá.'); return res.redirect('/gio-hang'); }
  try {
    const { tienHang } = await CartModel.items(req.session);
    const r = await VoucherModel.check(db, code, req.session.user.id, tienHang);
    req.session.voucher = code;
    flash(req, 'success', `Đã áp dụng mã ${code}.`);
    res.redirect(req.body.back === 'thanh-toan' ? '/thanh-toan' : '/gio-hang');
  } catch (e) { userError(req, res, e, '/gio-hang'); }
};
exports.removeVoucher = (req, res) => { req.session.voucher = null; res.redirect(req.body.back === 'thanh-toan' ? '/thanh-toan' : '/gio-hang'); };
