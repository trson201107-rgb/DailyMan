// [BACKEND B] Giỏ hàng: thêm / sửa / xóa, chọn dòng để thanh toán, xác nhận giá mới, mã giảm giá
const CartModel = require('../models/CartModel');
const VoucherModel = require('../models/VoucherModel');
const OrderModel = require('../models/OrderModel');
const TierModel = require('../models/TierModel');
const db = require('../config/db');
const { toInt } = require('../utils/helpers');
const { userError } = require('../utils/errors');
const { flash } = require('../middlewares/common');

/**
 * Tính tiền giỏ cho các dòng ĐANG ĐƯỢC CHỌN: tạm tính, ưu đãi hạng thành viên (nếu bật), mã giảm giá (nếu còn hợp lệ), phí ship, tổng.
 * Dùng chung cho trang giỏ và trang thanh toán.
 */
exports.summarize = async (req) => {
  const all = await CartModel.items(req.session);
  const sel = Array.isArray(req.session.selected) ? req.session.selected : null;       // null = chọn tất cả
  const lines = all.lines.map((l) => ({ ...l, Chon: !sel || sel.includes(l.MaBT) }));
  const chosen = lines.filter((l) => l.Chon);
  const tienHang = chosen.reduce((s, l) => s + l.ThanhTien, 0);
  const user = req.session.user;
  let hang = { bat: false, pct: 0, giam: 0, ten: null };
  if (user && tienHang > 0) hang = await TierModel.uuDai(db, user.id, tienHang);
  let giamVoucher = 0; let voucher = null;
  if (req.session.voucher && user && tienHang > 0) {
    try { const r = await VoucherModel.check(db, req.session.voucher, user.id, tienHang); voucher = r.voucher; giamVoucher = Math.min(r.giam, tienHang - hang.giam); }
    catch (e) { flash(req, 'error', 'Mã ' + req.session.voucher + ' không còn áp dụng được: ' + e.message); req.session.voucher = null; }
  }
  const phi = tienHang > 0 ? OrderModel.shipFee(tienHang) : 0;
  const giam = hang.giam + giamVoucher;
  return { lines, chosen, tienHang, hang, giamHang: hang.giam, giamVoucher, giam, voucher, phi, tong: tienHang + phi - giam,
           coGiaDoi: chosen.some((l) => l.GiaDoi) };
};

exports.view = async (req, res) => {
  const s = await exports.summarize(req);
  const wallet = req.session.user ? await VoucherModel.wallet(req.session.user.id) : [];
  res.render('shop/cart', { title: 'Giỏ hàng', ...s, wallet, code: req.session.voucher || '', step: 1 });
};

exports.add = async (req, res) => {
  const maSP = toInt(req.body.maSP); const back = '/san-pham/' + maSP;
  try {
    const maBT = await CartModel.resolve(maSP, toInt(req.body.maMau), toInt(req.body.maSize));
    const sl = req.body.soLuong === undefined ? 1 : toInt(req.body.soLuong);      // sai định dạng => null => CartModel báo lỗi
    await CartModel.add(req.session, maBT, sl);
    req.session.selected = undefined;                                            // thêm hàng mới thì chọn lại tất cả
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

/** Chọn những dòng sẽ thanh toán (các dòng không chọn vẫn nằm trong giỏ) */
exports.choose = (req, res) => {
  req.session.selected = [].concat(req.body.maBT || []).map((x) => toInt(x)).filter((x) => x !== null);
  res.redirect(req.body.di === 'thanh-toan' && req.session.selected.length ? '/thanh-toan' : '/gio-hang');
};
/** Khách xác nhận giá mới của sản phẩm trong giỏ */
exports.acceptPrices = async (req, res) => {
  await CartModel.acceptPrices(req.session);
  flash(req, 'success', 'Đã cập nhật theo giá mới. Bạn có thể tiếp tục thanh toán.');
  res.redirect('/gio-hang');
};

exports.applyVoucher = async (req, res) => {
  if (!req.session.user) { req.session.next = '/gio-hang'; flash(req, 'error', 'Vui lòng đăng nhập để dùng mã giảm giá.'); return res.redirect('/dang-nhap'); }
  const code = String(req.body.code || '').trim().toUpperCase();
  if (!code) { flash(req, 'error', 'Vui lòng nhập hoặc chọn mã giảm giá.'); return res.redirect('/gio-hang'); }
  try {
    const { lines } = await CartModel.items(req.session);
    const sel = Array.isArray(req.session.selected) ? req.session.selected : null;
    const tienHang = lines.filter((l) => !sel || sel.includes(l.MaBT)).reduce((s, l) => s + l.ThanhTien, 0);
    await VoucherModel.check(db, code, req.session.user.id, tienHang);
    const truoc = req.session.voucher;
    req.session.voucher = code;
    flash(req, 'success', truoc && truoc !== code ? `Đã đổi sang mã ${code} (mỗi đơn chỉ dùng một mã, mã ${truoc} đã được thay thế).` : `Đã áp dụng mã ${code}.`);
    res.redirect(req.body.back === 'thanh-toan' ? '/thanh-toan' : '/gio-hang');
  } catch (e) { userError(req, res, e, '/gio-hang'); }
};
exports.removeVoucher = (req, res) => { req.session.voucher = null; res.redirect(req.body.back === 'thanh-toan' ? '/thanh-toan' : '/gio-hang'); };
