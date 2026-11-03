// [BACKEND B] Thanh toán / đặt hàng / theo dõi đơn của khách
const crypto = require('crypto');
const OrderModel = require('../models/OrderModel');
const UserModel = require('../models/UserModel');
const C = require('../config/constants');
const { summarize } = require('./cartController');
const { AppError, userError } = require('../utils/errors');
const { toInt, pageInfo, pageMeta } = require('../utils/helpers');
const { flash } = require('../middlewares/common');
const { log } = require('../utils/logger');

const PHONE_RE = /^0\d{9,10}$/;

exports.checkoutForm = async (req, res) => {
  const s = await summarize(req);
  if (!s.lines.length) { flash(req, 'error', 'Giỏ hàng đang trống.'); return res.redirect('/gio-hang'); }
  if (s.lines.some((l) => l.HetHang || l.VuotTon)) { flash(req, 'error', 'Giỏ hàng có sản phẩm hết hàng hoặc vượt tồn kho. Vui lòng điều chỉnh trước khi thanh toán.'); return res.redirect('/gio-hang'); }
  const [u, methods] = await Promise.all([UserModel.findById(req.session.user.id), OrderModel.paymentMethods()]);
  req.session.checkoutToken = crypto.randomBytes(8).toString('hex');   // chống bấm đặt hàng nhiều lần
  res.render('shop/checkout', { title: 'Thanh toán', ...s, methods, token: req.session.checkoutToken, form: { ten: u.HoTen, sdt: u.SoDienThoai, diaChi: '', ghiChu: '', maPT: methods[0].MaPT }, errors: [] });
};

exports.place = async (req, res) => {
  const b = req.body; const s = req.session;
  if (s.lastOrder && s.lastOrder.token === b.token) {                // đã đặt rồi => trả về đơn đã tạo, không tạo đơn mới
    return res.redirect('/don-hang/' + s.lastOrder.maDH);
  }
  if (!b.token || s.checkoutToken !== b.token) { flash(req, 'error', 'Phiên đặt hàng đã hết hạn, vui lòng kiểm tra lại giỏ hàng.'); return res.redirect('/thanh-toan'); }

  const methods = await OrderModel.paymentMethods();
  const form = { ten: String(b.ten || '').trim(), sdt: String(b.sdt || '').trim(), diaChi: String(b.diaChi || '').trim(), ghiChu: String(b.ghiChu || '').trim().slice(0, 255), maPT: toInt(b.maPT) };
  const errors = [];
  if (form.ten.length < 2) errors.push('Vui lòng nhập họ tên người nhận.');
  if (!PHONE_RE.test(form.sdt)) errors.push('Số điện thoại người nhận không hợp lệ.');
  if (form.diaChi.length < 8) errors.push('Vui lòng nhập địa chỉ giao hàng cụ thể.');
  if (!methods.some((m) => m.MaPT === form.maPT)) errors.push('Vui lòng chọn phương thức thanh toán.');
  if (!errors.length) {
    try {
      const r = await OrderModel.create(s.user.id, { ten: form.ten, sdt: form.sdt, diaChi: form.diaChi, ghiChu: form.ghiChu || null, maPT: form.maPT, voucherCode: s.voucher || null });
      s.lastOrder = { token: b.token, maDH: r.maDH }; s.checkoutToken = null; s.voucher = null;
      log('DAT_HANG', { maDH: r.maDH, tong: r.tong }, s.user.email);
      flash(req, 'success', `Đặt hàng thành công! Mã đơn #${r.maDH}.`);
      return res.redirect('/don-hang/' + r.maDH + '?moi=1');
    } catch (e) {
      if (!(e instanceof AppError)) throw e;
      if (/giỏ hàng|tồn kho|ngừng bán/i.test(e.message)) return userError(req, res, e, '/gio-hang');
      errors.push(e.message);
    }
  }
  const sm = await summarize(req);
  res.status(400).render('shop/checkout', { title: 'Thanh toán', ...sm, methods, token: b.token, form, errors });
};

exports.list = async (req, res) => {
  const status = toInt(req.query.tt); const q = String(req.query.q || '').trim().slice(0, 20);
  const pg = pageInfo(req, 6);
  const [data, counts, statuses] = await Promise.all([
    OrderModel.search({ maTK: req.session.user.id, status, q: /^\d+$/.test(q) ? q : '' }, pg),
    OrderModel.statusCounts(req.session.user.id), OrderModel.statuses()
  ]);
  res.render('shop/orders', { title: 'Đơn hàng của tôi', items: data.items, meta: pageMeta(data.total, pg.page, pg.size), counts, statuses, status, q });
};

exports.detail = async (req, res) => {
  const o = await OrderModel.detail(toInt(req.params.id), req.session.user.id);   // chỉ xem được đơn của chính mình
  if (!o) return res.status(404).render('error', { title: 'Không tìm thấy', code: 404, message: 'Không tìm thấy đơn hàng.' });
  res.render('shop/order-detail', { title: 'Đơn hàng #' + o.MaDH, o, isNew: req.query.moi === '1', canCancel: o.MaTrangThai === C.STATUS.CHO });
};

exports.cancel = async (req, res) => {
  const id = toInt(req.params.id);
  try {
    await OrderModel.cancel(id, { allowed: [C.STATUS.CHO], userId: req.session.user.id, maTK: req.session.user.id, note: 'Khách hủy đơn' });
    log('HUY_DON', { maDH: id, boi: 'khach' }, req.session.user.email);
    flash(req, 'success', 'Đã hủy đơn hàng.'); res.redirect('/don-hang/' + id);
  } catch (e) { userError(req, res, e, '/don-hang/' + id); }
};
