// [BACKEND B] Quản trị khuyến mãi dạng mã giảm giá (UC15): tạo, sửa, kết thúc, xóa, phát vào ví khách
const VoucherModel = require('../models/VoucherModel');
const TierModel = require('../models/TierModel');
const { AppError, userError } = require('../utils/errors');
const { toInt, pageInfo, pageMeta, dateOnly } = require('../utils/helpers');
const { EMAIL_RE } = require('../utils/validators');
const C = require('../config/constants');
const { flash } = require('../middlewares/common');
const { log } = require('../utils/logger');

function parseVoucher(b, isNew) {
  const e = [];
  const v = {
    code: String(b.code || '').trim().toUpperCase(), loai: b.loai === 'PHAN_TRAM' ? 'PHAN_TRAM' : 'TIEN',
    giaTri: toInt(b.giaTri), toiThieu: b.toiThieu === '' || b.toiThieu === undefined ? 0 : toInt(b.toiThieu), luot: toInt(b.luot), bd: dateOnly(b.bd), hh: dateOnly(b.hh)
  };
  if (isNew && !/^[A-Z0-9_-]{3,20}$/.test(v.code)) e.push('Mã gồm 3–20 ký tự: chữ in hoa, số, gạch ngang hoặc gạch dưới.');
  if (v.giaTri === null || v.giaTri <= 0) e.push('Giá trị giảm phải là số nguyên lớn hơn 0.');
  else if (v.loai === 'PHAN_TRAM' && v.giaTri > 100) e.push('Giảm theo phần trăm tối đa 100%.');
  else if (v.loai === 'TIEN' && v.giaTri > 10000000) e.push('Giảm theo số tiền tối đa 10.000.000đ.');
  if (v.toiThieu === null || v.toiThieu < 0) e.push('Đơn tối thiểu phải là số nguyên >= 0.');
  if (v.luot === null || v.luot < 1 || v.luot > 100000) e.push('Số lượt sử dụng phải từ 1 đến 100.000.');
  if (!v.bd || !v.hh) e.push('Vui lòng chọn ngày bắt đầu và ngày hết hạn.');
  else if (v.hh < v.bd) e.push('Ngày hết hạn phải sau hoặc bằng ngày bắt đầu.');
  return { v, errors: e };
}

exports.list = async (req, res) => {
  const f = { q: String(req.query.q || '').trim().slice(0, 20), tinhTrang: ['Đang chạy', 'Chưa bắt đầu', 'Hết hạn', 'Hết lượt'].includes(req.query.tt) ? req.query.tt : '' };
  const pg = pageInfo(req, C.ADMIN_PAGE_SIZE);
  const [data, tiers] = await Promise.all([VoucherModel.search(f, pg), TierModel.list()]);
  res.render('admin/vouchers', { title: 'Khuyến mãi & voucher', items: data.items, meta: pageMeta(data.total, pg.page, pg.size), f, tiers });
};
exports.newForm = (req, res) => res.render('admin/voucher-form', { title: 'Thêm voucher', mode: 'new', id: null, errors: [], form: { code: '', loai: 'PHAN_TRAM', giaTri: '', toiThieu: 0, luot: 100, bd: '', hh: '' } });
exports.create = async (req, res) => {
  const { v, errors } = parseVoucher(req.body, true);
  if (!errors.length) {
    try { const id = await VoucherModel.create(v); log('VOUCHER_TAO', { id, code: v.code }, req.session.user.email); flash(req, 'success', `Đã tạo voucher ${v.code}.`); return res.redirect('/admin/voucher'); }
    catch (e) { if (e instanceof AppError) errors.push(e.message); else throw e; }
  }
  res.status(400).render('admin/voucher-form', { title: 'Thêm voucher', mode: 'new', id: null, errors, form: { ...v, giaTri: req.body.giaTri, luot: req.body.luot } });
};
exports.editForm = async (req, res) => {
  const v = await VoucherModel.find(toInt(req.params.id));
  if (!v) return res.status(404).render('error', { title: 'Không tìm thấy', code: 404, message: 'Không tìm thấy voucher.' });
  const d = (x) => new Date(x).toISOString().slice(0, 10);
  res.render('admin/voucher-form', { title: 'Sửa voucher ' + v.MaCode, mode: 'edit', id: v.MaVoucher, errors: [],
    form: { code: v.MaCode, loai: v.LoaiGiam, giaTri: v.GiaTriGiam, toiThieu: v.DonToiThieu, luot: v.SoLuotConLai, bd: d(v.NgayBatDau), hh: d(v.NgayHetHan) } });
};
exports.update = async (req, res) => {
  const id = toInt(req.params.id); const { v, errors } = parseVoucher(req.body, false);
  if (errors.length) return res.status(400).render('admin/voucher-form', { title: 'Sửa voucher', mode: 'edit', id, errors, form: { ...v, code: req.body.code, giaTri: req.body.giaTri, luot: req.body.luot } });
  await VoucherModel.update(id, v); log('VOUCHER_SUA', { id }, req.session.user.email);
  flash(req, 'success', 'Đã cập nhật voucher.'); res.redirect('/admin/voucher');
};
exports.expire = async (req, res) => { await VoucherModel.expire(toInt(req.params.id)); flash(req, 'success', 'Đã kết thúc voucher (hết hạn từ hôm qua).'); res.redirect('/admin/voucher'); };
exports.remove = async (req, res) => {
  try { await VoucherModel.remove(toInt(req.params.id)); log('VOUCHER_XOA', req.params.id, req.session.user.email); flash(req, 'success', 'Đã xóa voucher.'); res.redirect('/admin/voucher'); }
  catch (e) { userError(req, res, e, '/admin/voucher'); }
};
/** Phát voucher vào ví: tất cả khách / theo hạng / một khách theo email */
exports.distribute = async (req, res) => {
  const id = toInt(req.params.id); const doiTuong = ['all', 'hang', 'email'].includes(req.body.doiTuong) ? req.body.doiTuong : 'all';
  const email = String(req.body.email || '').trim().toLowerCase();
  if (doiTuong === 'email' && !EMAIL_RE.test(email)) { flash(req, 'error', 'Vui lòng nhập email khách hàng hợp lệ.'); return res.redirect('/admin/voucher'); }
  const n = await VoucherModel.distribute(id, { doiTuong, maHang: toInt(req.body.maHang), email });
  log('VOUCHER_PHAT', { id, doiTuong, soKhach: n }, req.session.user.email);
  flash(req, n ? 'success' : 'info', n ? `Đã phát voucher vào ví của ${n} khách hàng.` : 'Không có khách nào nhận thêm (đã có mã trong ví hoặc không tìm thấy).');
  res.redirect('/admin/voucher');
};
