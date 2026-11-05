// [BACKEND B] Sổ địa chỉ giao hàng của khách (thêm, sửa, xóa, đặt mặc định)
const AddressModel = require('../models/AddressModel');
const provinces = require('../utils/provinces');
const { parseAddress, safeNext } = require('../utils/validators');
const { toInt } = require('../utils/helpers');
const { userError } = require('../utils/errors');
const { flash } = require('../middlewares/common');

const uid = (req) => req.session.user.id;
const next = (req) => safeNext(req.query.next || req.body.next);

exports.list = async (req, res) => {
  res.render('auth/addresses', { title: 'Sổ địa chỉ', addresses: await AddressModel.list(uid(req)) });
};
exports.newForm = (req, res) => {
  res.render('auth/address-form', { title: 'Thêm địa chỉ', mode: 'new', id: null, provinces, next: next(req), errors: [],
    form: { ten: req.session.user.name, sdt: '', tinh: '', quan: '', cuThe: '', macDinh: false } });
};
exports.create = async (req, res) => {
  const { a, errors } = parseAddress(req.body);
  if (errors.length) return res.status(400).render('auth/address-form', { title: 'Thêm địa chỉ', mode: 'new', id: null, provinces, next: next(req), errors, form: { ...a, macDinh: req.body.macDinh === '1' } });
  try { await AddressModel.create(uid(req), a, req.body.macDinh === '1'); flash(req, 'success', 'Đã thêm địa chỉ.'); res.redirect(next(req)); }
  catch (e) { userError(req, res, e, '/tai-khoan/dia-chi'); }
};
exports.editForm = async (req, res) => {
  const a = await AddressModel.find(toInt(req.params.id), uid(req));
  if (!a) return res.status(404).render('error', { title: 'Không tìm thấy', code: 404, message: 'Không tìm thấy địa chỉ.' });
  res.render('auth/address-form', { title: 'Sửa địa chỉ', mode: 'edit', id: a.MaDC, provinces, next: next(req), errors: [],
    form: { ten: a.TenNguoiNhan, sdt: a.SDT, tinh: a.TinhThanh, quan: a.QuanHuyen, cuThe: a.DiaChiCuThe, macDinh: !!a.MacDinh } });
};
exports.update = async (req, res) => {
  const id = toInt(req.params.id); const { a, errors } = parseAddress(req.body);
  if (errors.length) return res.status(400).render('auth/address-form', { title: 'Sửa địa chỉ', mode: 'edit', id, provinces, next: next(req), errors, form: { ...a, macDinh: req.body.macDinh === '1' } });
  try { await AddressModel.update(id, uid(req), a, req.body.macDinh === '1'); flash(req, 'success', 'Đã cập nhật địa chỉ.'); res.redirect(next(req)); }
  catch (e) { userError(req, res, e, '/tai-khoan/dia-chi'); }
};
exports.setDefault = async (req, res) => {
  try { await AddressModel.setDefault(toInt(req.params.id), uid(req)); flash(req, 'success', 'Đã đặt làm địa chỉ mặc định.'); res.redirect(next(req)); }
  catch (e) { userError(req, res, e, '/tai-khoan/dia-chi'); }
};
exports.remove = async (req, res) => {
  try { await AddressModel.remove(toInt(req.params.id), uid(req)); flash(req, 'success', 'Đã xóa địa chỉ.'); res.redirect(next(req)); }
  catch (e) { userError(req, res, e, '/tai-khoan/dia-chi'); }
};
