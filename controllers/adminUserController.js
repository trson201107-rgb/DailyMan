// [BACKEND B] Quản trị tài khoản (Admin) + tra cứu khách hàng (Staff/Admin, UC14, UC17)
const bcrypt = require('bcryptjs');
const UserModel = require('../models/UserModel');
const OrderModel = require('../models/OrderModel');
const C = require('../config/constants');
const { AppError } = require('../utils/errors');
const { EMAIL_RE, PHONE_RE } = require('../utils/validators');
const { toInt, pageInfo, pageMeta } = require('../utils/helpers');
const { flash } = require('../middlewares/common');
const { log } = require('../utils/logger');

exports.users = async (req, res) => {
  const f = { q: String(req.query.q || '').trim().slice(0, 50), role: Object.values(C.ROLE).includes(req.query.role) ? req.query.role : '' };
  const pg = pageInfo(req, C.ADMIN_PAGE_SIZE);
  const data = await UserModel.search(f, pg);
  res.render('admin/users', { title: 'Tài khoản', items: data.items, meta: pageMeta(data.total, pg.page, pg.size), f, roles: Object.values(C.ROLE) });
};

/** Hồ sơ khách + hạng + tổng chi tiêu + lịch sử đơn hàng */
exports.detail = async (req, res) => {
  const id = toInt(req.params.id);
  const u = id ? await UserModel.findById(id) : null;
  if (!u) return res.status(404).render('error', { title: 'Không tìm thấy', code: 404, message: 'Không tìm thấy tài khoản.' });
  const [sp, orders] = await Promise.all([UserModel.spending(id), OrderModel.search({ maTK: id }, { offset: 0, size: 50 })]);
  res.render('admin/customer', { title: u.HoTen, u, sp, orders: orders.items, soDon: orders.total });
};

exports.newForm = (req, res) => res.render('admin/user-form', { title: 'Thêm tài khoản', errors: [], roles: Object.values(C.ROLE), form: { hoTen: '', email: '', sdt: '', role: C.ROLE.STAFF } });
exports.create = async (req, res) => {
  const b = req.body;
  const form = { hoTen: String(b.hoTen || '').trim(), email: String(b.email || '').trim().toLowerCase(), sdt: String(b.sdt || '').trim(), role: Object.values(C.ROLE).includes(b.role) ? b.role : C.ROLE.STAFF };
  const errors = [];
  if (form.hoTen.length < 2 || form.hoTen.length > 100) errors.push('Họ tên phải từ 2 đến 100 ký tự.');
  if (!EMAIL_RE.test(form.email)) errors.push('Email không hợp lệ.');
  if (!PHONE_RE.test(form.sdt)) errors.push('Số điện thoại phải bắt đầu bằng 0 và có 10–11 chữ số.');
  if (String(b.matKhau || '').length < 6) errors.push('Mật khẩu phải có ít nhất 6 ký tự.');
  if (!errors.length) {
    try {
      const id = await UserModel.createByAdmin({ ...form, hash: await bcrypt.hash(b.matKhau, 10) });
      log('TAO_TAI_KHOAN', { id, role: form.role }, req.session.user.email);
      flash(req, 'success', `Đã tạo tài khoản ${form.email} (${form.role}).`);
      return res.redirect('/admin/tai-khoan/' + id);
    } catch (e) { if (e instanceof AppError) errors.push(e.message); else throw e; }
  }
  res.status(400).render('admin/user-form', { title: 'Thêm tài khoản', errors, roles: Object.values(C.ROLE), form });
};

exports.setRole = async (req, res) => {
  const id = toInt(req.params.id); const role = req.body.role;
  if (id === req.session.user.id) { flash(req, 'error', 'Không thể tự đổi vai trò của chính mình.'); return res.redirect('/admin/tai-khoan'); }
  if (!Object.values(C.ROLE).includes(role)) { flash(req, 'error', 'Vai trò không hợp lệ.'); return res.redirect('/admin/tai-khoan'); }
  await UserModel.setRole(id, role); log('DOI_VAI_TRO', { id, role }, req.session.user.email);
  flash(req, 'success', 'Đã đổi vai trò.'); res.redirect('/admin/tai-khoan');
};
exports.setStatus = async (req, res) => {
  const id = toInt(req.params.id); const st = req.body.trangThai === 'Bị khóa' ? 'Bị khóa' : 'Hoạt động';
  if (id === req.session.user.id) { flash(req, 'error', 'Không thể tự khóa tài khoản của chính mình.'); return res.redirect('/admin/tai-khoan'); }
  await UserModel.setStatus(id, st); log('DOI_TRANG_THAI_TK', { id, st }, req.session.user.email);
  flash(req, 'success', st === 'Bị khóa' ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.'); res.redirect('/admin/tai-khoan');
};
