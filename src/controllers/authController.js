// [BACKEND B] Đăng ký / đăng nhập / đăng xuất / hồ sơ cá nhân
const bcrypt = require('bcryptjs');
const UserModel = require('../models/UserModel');
const CartModel = require('../models/CartModel');
const C = require('../config/constants');
const { AppError, userError } = require('../utils/errors');
const { flash } = require('../middlewares/common');
const { log } = require('../utils/logger');
const { isStaff } = require('../middlewares/auth');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^0\d{9,10}$/;

async function startSession(req, u) {
  await CartModel.merge(req.session, u.MaTK);                  // giỏ tạm của Guest được gộp vào tài khoản
  req.session.user = { id: u.MaTK, name: u.HoTen, email: u.Email, role: u.TenVaiTro };
  req.session.voucher = null;
}
function goAfterLogin(req, res, u) {
  const next = req.session.next; req.session.next = null;
  if (next && next.startsWith('/') && !next.startsWith('//')) return res.redirect(next);
  if (u.TenVaiTro === C.ROLE.ADMIN) return res.redirect('/admin');
  if (u.TenVaiTro === C.ROLE.STAFF) return res.redirect('/admin/don-hang');
  res.redirect('/');
}

exports.loginForm = (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('auth/login', { title: 'Đăng nhập', tab: 'login', form: {}, errors: [] });
};

exports.login = async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase(); const pw = String(req.body.matKhau || '');
  const fail = (msg) => res.status(400).render('auth/login', { title: 'Đăng nhập', tab: 'login', form: { email }, errors: [msg] });
  if (!email || !pw) return fail('Vui lòng nhập email và mật khẩu.');
  const u = await UserModel.findByEmail(email);
  if (!u) return fail('Email hoặc mật khẩu không đúng.');
  if (u.TrangThai === 'Bị khóa') return fail('Tài khoản đã bị khóa. Vui lòng liên hệ cửa hàng.');
  if (u.DangKhoa) return fail(`Bạn nhập sai mật khẩu quá nhiều lần. Thử lại sau khoảng ${Math.max(1, u.PhutConKhoa)} phút.`);
  const ok = await bcrypt.compare(pw, u.MatKhauHash);
  if (!ok) { await UserModel.failLogin(u.MaTK); log('DANG_NHAP_SAI', email); return fail('Email hoặc mật khẩu không đúng.'); }
  await UserModel.resetLogin(u.MaTK);
  await startSession(req, u);
  log('DANG_NHAP', { role: u.TenVaiTro }, email);
  flash(req, 'success', `Xin chào ${u.HoTen}!`);
  goAfterLogin(req, res, u);
};

exports.registerForm = (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('auth/login', { title: 'Đăng ký', tab: 'register', form: {}, errors: [] });
};

exports.register = async (req, res) => {
  const b = req.body;
  const form = { hoTen: String(b.hoTen || '').trim(), email: String(b.email || '').trim().toLowerCase(), sdt: String(b.sdt || '').trim() };
  const errors = [];
  if (form.hoTen.length < 2 || form.hoTen.length > 100) errors.push('Họ tên phải từ 2 đến 100 ký tự.');
  if (!EMAIL_RE.test(form.email) || form.email.length > 100) errors.push('Email không hợp lệ.');
  if (!PHONE_RE.test(form.sdt)) errors.push('Số điện thoại phải bắt đầu bằng 0 và có 10–11 chữ số.');
  if (String(b.matKhau || '').length < 6) errors.push('Mật khẩu phải có ít nhất 6 ký tự.');
  if (b.matKhau !== b.matKhau2) errors.push('Mật khẩu nhập lại không khớp.');
  if (!errors.length) {
    try {
      const hash = await bcrypt.hash(b.matKhau, 10);
      const id = await UserModel.createCustomer({ hoTen: form.hoTen, email: form.email, sdt: form.sdt, hash });
      const u = await UserModel.findById(id);
      await startSession(req, u);
      log('DANG_KY', form.email);
      flash(req, 'success', 'Đăng ký thành công! Chào mừng bạn đến với dailyman.');
      return goAfterLogin(req, res, u);
    } catch (e) { if (e instanceof AppError) errors.push(e.message); else throw e; }
  }
  res.status(400).render('auth/login', { title: 'Đăng ký', tab: 'register', form, errors });
};

exports.logout = (req, res) => { req.session = null; res.redirect('/'); };   // giỏ hàng tài khoản vẫn được giữ trong DB

// ---- Hồ sơ cá nhân ----
exports.profile = async (req, res) => {
  const [u, sp] = await Promise.all([UserModel.findById(req.session.user.id), UserModel.spending(req.session.user.id)]);
  res.render('auth/profile', { title: 'Tài khoản của tôi', u, sp, isStaff: isStaff(req.session.user) });
};
exports.updateProfile = async (req, res) => {
  const hoTen = String(req.body.hoTen || '').trim(); const sdt = String(req.body.sdt || '').trim();
  if (hoTen.length < 2 || !PHONE_RE.test(sdt)) { flash(req, 'error', 'Họ tên hoặc số điện thoại không hợp lệ.'); return res.redirect('/tai-khoan'); }
  try {
    await UserModel.updateProfile(req.session.user.id, { hoTen, sdt });
    req.session.user = { ...req.session.user, name: hoTen };
    flash(req, 'success', 'Đã cập nhật hồ sơ.'); res.redirect('/tai-khoan');
  } catch (e) { userError(req, res, e, '/tai-khoan'); }
};
exports.changePassword = async (req, res) => {
  const { matKhauCu, matKhauMoi, matKhauMoi2 } = req.body;
  const u = await UserModel.findById(req.session.user.id);
  if (!(await bcrypt.compare(String(matKhauCu || ''), u.MatKhauHash))) { flash(req, 'error', 'Mật khẩu hiện tại không đúng.'); return res.redirect('/tai-khoan'); }
  if (String(matKhauMoi || '').length < 6) { flash(req, 'error', 'Mật khẩu mới phải có ít nhất 6 ký tự.'); return res.redirect('/tai-khoan'); }
  if (matKhauMoi !== matKhauMoi2) { flash(req, 'error', 'Mật khẩu nhập lại không khớp.'); return res.redirect('/tai-khoan'); }
  await UserModel.updatePassword(u.MaTK, await bcrypt.hash(matKhauMoi, 10));
  log('DOI_MAT_KHAU', '', u.Email);
  flash(req, 'success', 'Đã đổi mật khẩu.'); res.redirect('/tai-khoan');
};
