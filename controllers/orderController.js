// [BACKEND B] Thanh toán / đặt hàng / theo dõi, hủy, đổi trả đơn của khách
const crypto = require('crypto');
const OrderModel = require('../models/OrderModel');
const UserModel = require('../models/UserModel');
const AddressModel = require('../models/AddressModel');
const ReturnModel = require('../models/ReturnModel');
const provinces = require('../utils/provinces');
const C = require('../config/constants');
const { summarize } = require('./cartController');
const { AppError, userError } = require('../utils/errors');
const { parseAddress } = require('../utils/validators');
const { toInt, pageInfo, pageMeta } = require('../utils/helpers');
const { flash } = require('../middlewares/common');
const { log } = require('../utils/logger');

async function renderCheckout(req, res, status, extra) {
  const s = await summarize(req);
  const [methods, addresses] = await Promise.all([OrderModel.paymentMethods(), AddressModel.list(req.session.user.id)]);
  const def = addresses.find((a) => a.MacDinh) || addresses[0];
  res.status(status).render('shop/checkout', {
    title: 'Thanh toán', ...s, methods, addresses, provinces, step: 2, errors: [], token: req.session.checkoutToken,
    form: { maDC: def ? String(def.MaDC) : 'moi', ten: req.session.user.name, sdt: '', tinh: '', quan: '', cuThe: '', ghiChu: '', maPT: methods[0].MaPT, luu: false },
    ...extra
  });
}

exports.checkoutForm = async (req, res) => {
  const s = await summarize(req);
  if (!s.lines.length) { flash(req, 'error', 'Giỏ hàng đang trống.'); return res.redirect('/gio-hang'); }
  if (!s.chosen.length) { flash(req, 'error', 'Vui lòng chọn ít nhất một sản phẩm để thanh toán.'); return res.redirect('/gio-hang'); }
  if (s.chosen.some((l) => l.HetHang || l.VuotTon)) { flash(req, 'error', 'Giỏ hàng có sản phẩm hết hàng hoặc vượt tồn kho. Vui lòng điều chỉnh trước khi thanh toán.'); return res.redirect('/gio-hang'); }
  if (s.coGiaDoi) { flash(req, 'error', 'Giá của một số sản phẩm trong giỏ hàng đã thay đổi. Vui lòng xem lại và xác nhận giá mới trước khi thanh toán.'); return res.redirect('/gio-hang'); }
  req.session.checkoutToken = crypto.randomBytes(8).toString('hex');   // chống bấm đặt hàng nhiều lần
  await renderCheckout(req, res, 200, { token: req.session.checkoutToken });
};

exports.place = async (req, res) => {
  const b = req.body; const s = req.session;
  if (s.lastOrder && s.lastOrder.token === b.token) return res.redirect('/don-hang/' + s.lastOrder.maDH);   // đã đặt rồi => trả về đơn đã tạo
  if (!b.token || s.checkoutToken !== b.token) { flash(req, 'error', 'Phiên đặt hàng đã hết hạn, vui lòng kiểm tra lại giỏ hàng.'); return res.redirect('/thanh-toan'); }

  const methods = await OrderModel.paymentMethods();
  const errors = [];
  const form = { maDC: String(b.maDC || 'moi'), ten: String(b.ten || '').trim(), sdt: String(b.sdt || '').trim(), tinh: String(b.tinh || '').trim(),
                 quan: String(b.quan || '').trim(), cuThe: String(b.cuThe || '').trim(), ghiChu: String(b.ghiChu || '').trim().slice(0, 255), maPT: toInt(b.maPT), luu: b.luu === '1' };
  let addr = null;
  if (/^\d+$/.test(form.maDC)) {                                   // dùng địa chỉ đã lưu (phải là địa chỉ của chính khách)
    const a = await AddressModel.find(parseInt(form.maDC, 10), s.user.id);
    if (!a) errors.push('Địa chỉ đã chọn không hợp lệ.'); else addr = { ten: a.TenNguoiNhan, sdt: a.SDT, text: AddressModel.format(a) };
  } else {                                                          // nhập địa chỉ mới: đủ người nhận, SĐT, tỉnh, quận, địa chỉ cụ thể
    const r = parseAddress(form); errors.push(...r.errors);
    if (!r.errors.length) addr = { ten: r.a.ten, sdt: r.a.sdt, text: AddressModel.format({ DiaChiCuThe: r.a.cuThe, QuanHuyen: r.a.quan, TinhThanh: r.a.tinh }), moi: r.a };
  }
  if (!methods.some((m) => m.MaPT === form.maPT)) errors.push('Vui lòng chọn phương thức thanh toán.');
  if (!errors.length) {
    try {
      const r = await OrderModel.create(s.user.id, { ten: addr.ten, sdt: addr.sdt, diaChi: addr.text, ghiChu: form.ghiChu || null, maPT: form.maPT,
        voucherCode: s.voucher || null, selected: Array.isArray(s.selected) ? s.selected : null });
      if (addr.moi && form.luu) { try { await AddressModel.create(s.user.id, addr.moi); } catch (_) { /* không ảnh hưởng đơn đã đặt */ } }
      s.lastOrder = { token: b.token, maDH: r.maDH }; s.checkoutToken = null; s.voucher = null; s.selected = undefined;
      log('DAT_HANG', { maDH: r.maDH, tong: r.tong }, s.user.email);
      flash(req, 'success', `Đặt hàng thành công! Mã đơn #${r.maDH}.`);
      return res.redirect('/don-hang/' + r.maDH + '?moi=1');
    } catch (e) {
      if (!(e instanceof AppError)) throw e;
      if (/giỏ hàng|tồn kho|ngừng bán/i.test(e.message)) return userError(req, res, e, '/gio-hang');
      errors.push(e.message);
    }
  }
  await renderCheckout(req, res, 400, { errors, form, token: b.token });
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
  const trongHan = o.soNgayHoanThanh === null || o.soNgayHoanThanh <= C.RETURN_DAYS;
  const canReturn = o.MaTrangThai === C.STATUS.HOAN_THANH && trongHan && (!o.doiTra || o.doiTra.TrangThai === C.RETURN.NO);
  res.render('shop/order-detail', { title: 'Đơn hàng #' + o.MaDH, o, isNew: req.query.moi === '1', step: 3, canCancel: o.MaTrangThai === C.STATUS.CHO,
    canReturn, hetHanDoiTra: o.MaTrangThai === C.STATUS.HOAN_THANH && !trongHan, RETURN_DAYS: C.RETURN_DAYS, S: C.STATUS });
};

exports.cancel = async (req, res) => {
  const id = toInt(req.params.id);
  try {
    await OrderModel.cancel(id, { allowed: [C.STATUS.CHO], userId: req.session.user.id, maTK: req.session.user.id, note: 'Khách hủy đơn' });
    log('HUY_DON', { maDH: id, boi: 'khach' }, req.session.user.email);
    flash(req, 'success', 'Đã hủy đơn hàng.'); res.redirect('/don-hang/' + id);
  } catch (e) { userError(req, res, e, '/don-hang/' + id); }
};

/** Khách gửi yêu cầu đổi trả cho đơn đã Hoàn thành */
exports.requestReturn = async (req, res) => {
  const id = toInt(req.params.id); const back = '/don-hang/' + id;
  const lyDo = String(req.body.lyDo || '').trim().slice(0, 500);
  if (!lyDo) { flash(req, 'error', 'Vui lòng nhập lý do đổi trả.'); return res.redirect(back); }
  try {
    const maYC = await ReturnModel.create(req.session.user.id, id, lyDo);
    log('DOI_TRA_GUI', { maDH: id, maYC }, req.session.user.email);
    flash(req, 'success', 'Đã gửi yêu cầu đổi trả. Cửa hàng sẽ xem xét và phản hồi sớm.'); res.redirect(back);
  } catch (e) { userError(req, res, e, back); }
};
