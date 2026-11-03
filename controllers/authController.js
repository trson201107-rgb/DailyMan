// [BACKEND B] Đăng ký / đăng nhập (email hoặc SĐT, ghi nhớ) / quên và đặt lại mật khẩu / hồ sơ cá nhân
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const UserModel = require('../models/UserModel');
const CartModel = require('../models/CartModel');
const ResetModel = require('../models/ResetModel');
const AddressModel = require('../models/AddressModel');
const mailer = require('../utils/mailer');
const C = require('../config/constants');
const { AppError, userError } = require('../utils/errors');
const { EMAIL_RE, PHONE_RE } = require('../utils/validators');
const { flash } = require('../middlewares/common');
const { log } = require('../utils/logger');
const { isStaff } = require('../middlewares/auth');

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

async function startSession(req, u, remember = false) {
  await CartModel.merge(req.session, u.MaTK);                  // giỏ tạm của Guest được gộp vào tài khoản
  req.session.user = { id: u.MaTK, name: u.HoTen, email: u.Email, role: u.TenVaiTro };
  req.session.voucher = null; req.session.selected = undefined;
  req.session.remember = !!remember;
  if (req.sessionOptions) req.sessionOptions.maxAge = remember ? C.REMEMBER_DAYS * 24 * 3600 * 1000 : undefined;
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
  const b = req.body;
  const raw = String(b.taiKhoan ?? b.email ?? '').trim();
  const ident = raw.includes('@') ? raw.toLowerCase() : raw.replace(/[\s.\-]/g, '');   // email hoặc số điện thoại
  const pw = String(b.matKhau || '');
  const fail = (msg) => res.status(400).render('auth/login', { title: 'Đăng nhập', tab: 'login', form: { taiKhoan: raw, remember: b.remember === '1' }, errors: [msg] });
  if (!ident || !pw) return fail('Vui lòng nhập email (hoặc số điện thoại) và mật khẩu.');
  const u = await UserModel.findByLogin(ident);
  if (!u) return fail('Tài khoản hoặc mật khẩu không đúng.');
  if (u.TrangThai === 'Bị khóa') return fail('Tài khoản đã bị khóa. Vui lòng liên hệ cửa hàng.');
  if (u.DangKhoa) return fail(`Bạn nhập sai mật khẩu quá nhiều lần. Thử lại sau khoảng ${Math.max(1, u.PhutConKhoa)} phút.`);
  const ok = await bcrypt.compare(pw, u.MatKhauHash);
  if (!ok) { await UserModel.failLogin(u.MaTK); log('DANG_NHAP_SAI', ident); return fail('Tài khoản hoặc mật khẩu không đúng.'); }
  await UserModel.resetLogin(u.MaTK);
  await startSession(req, u, b.remember === '1');
  log('DANG_NHAP', { role: u.TenVaiTro, ghiNho: b.remember === '1' }, u.Email);
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

// ---- Quên mật khẩu / đặt lại mật khẩu (UC02) ----
exports.forgotForm = (req, res) => res.render('auth/forgot', { title: 'Quên mật khẩu', sent: false, demoLink: null, email: '', errors: [] });

exports.forgot = async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return res.status(400).render('auth/forgot', { title: 'Quên mật khẩu', sent: false, demoLink: null, email, errors: ['Email không hợp lệ.'] });
  const u = await UserModel.findByEmail(email);
  let demoLink = null;
  // Luôn trả lời giống nhau dù email có tồn tại hay không (không để lộ email nào đã đăng ký)
  if (u && u.TrangThai !== 'Bị khóa') {
    const token = crypto.randomBytes(32).toString('hex');
    await ResetModel.create(u.MaTK, sha256(token), C.RESET_MINUTES);
    const base = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const link = `${base}/dat-lai-mat-khau/${token}`;
    try {
      await mailer.send({
        to: u.Email, subject: 'Đặt lại mật khẩu dailyman',
        text: `Chào ${u.HoTen},\n\nBấm vào liên kết sau để đặt lại mật khẩu (có hiệu lực ${C.RESET_MINUTES} phút, dùng một lần):\n${link}\n\nNếu bạn không yêu cầu, hãy bỏ qua email này.`,
        html: `<p>Chào ${u.HoTen.replace(/</g, '&lt;')},</p><p>Bấm vào liên kết sau để đặt lại mật khẩu (có hiệu lực ${C.RESET_MINUTES} phút, dùng một lần):</p><p><a href="${link}">${link}</a></p><p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>`
      });
    } catch (e) { log('LOI_GUI_MAIL', e.message, u.Email); }
    if (!mailer.configured()) {
      if (process.env.RESET_SHOW_LINK === 'true') demoLink = link;                 // chỉ để DEMO khi chưa có SMTP — KHÔNG bật trên hệ thống thật
      if (process.env.NODE_ENV !== 'production') console.log('[DEV] Liên kết đặt lại mật khẩu:', link);
    }
    log('QUEN_MAT_KHAU', 'đã tạo liên kết đặt lại', u.Email);
  }
  res.render('auth/forgot', { title: 'Quên mật khẩu', sent: true, demoLink, email, errors: [] });
};

async function findToken(req) { return ResetModel.find(sha256(String(req.params.token || ''))); }
exports.resetForm = async (req, res) => {
  const r = await findToken(req);
  if (!r || !r.ConHieuLuc) return res.status(410).render('auth/reset', { title: 'Đặt lại mật khẩu', invalid: true, errors: [], email: '' });
  res.render('auth/reset', { title: 'Đặt lại mật khẩu', invalid: false, errors: [], email: r.Email });
};
exports.reset = async (req, res) => {
  const r = await findToken(req);
  if (!r || !r.ConHieuLuc) return res.status(410).render('auth/reset', { title: 'Đặt lại mật khẩu', invalid: true, errors: [], email: '' });
  const { matKhauMoi, matKhauMoi2 } = req.body; const errors = [];
  if (String(matKhauMoi || '').length < 6) errors.push('Mật khẩu mới phải có ít nhất 6 ký tự.');
  if (matKhauMoi !== matKhauMoi2) errors.push('Mật khẩu nhập lại không khớp.');
  if (errors.length) return res.status(400).render('auth/reset', { title: 'Đặt lại mật khẩu', invalid: false, errors, email: r.Email });
  try {
    await ResetModel.consume(sha256(req.params.token), await bcrypt.hash(matKhauMoi, 10));
    log('DAT_LAI_MAT_KHAU', 'thành công', r.Email);
    flash(req, 'success', 'Đã đặt lại mật khẩu. Bạn có thể đăng nhập bằng mật khẩu mới.');
    res.redirect('/dang-nhap');
  } catch (e) { if (e instanceof AppError) return res.status(410).render('auth/reset', { title: 'Đặt lại mật khẩu', invalid: true, errors: [], email: '' }); throw e; }
};

// ---- Hồ sơ cá nhân ----
exports.profile = async (req, res) => {
  const [u, sp, addresses] = await Promise.all([UserModel.findById(req.session.user.id), UserModel.spending(req.session.user.id), AddressModel.list(req.session.user.id)]);
  res.render('auth/profile', { title: 'Tài khoản của tôi', u, sp, addresses, isStaff: isStaff(req.session.user) });
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
