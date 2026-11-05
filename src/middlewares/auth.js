// Phân quyền kiểm tra ở phía máy chủ (Guest / Customer / Staff / Admin)
const { ROLE } = require('../config/constants');
const { flash } = require('./common');

const isStaff = (u) => u && (u.role === ROLE.STAFF || u.role === ROLE.ADMIN);

function requireLogin(req, res, next) {
  if (req.session.user) return next();
  req.session.next = req.originalUrl;
  flash(req, 'error', 'Vui lòng đăng nhập để tiếp tục.');
  res.redirect('/dang-nhap');
}
function requireStaff(req, res, next) {
  if (isStaff(req.session.user)) return next();
  if (!req.session.user) { req.session.next = req.originalUrl; flash(req, 'error', 'Vui lòng đăng nhập tài khoản quản trị.'); return res.redirect('/dang-nhap'); }
  res.status(403).render('error', { title: 'Không có quyền', code: 403, message: 'Bạn không có quyền truy cập trang quản trị.' });
}
function requireAdmin(req, res, next) {
  const u = req.session.user;
  if (u && u.role === ROLE.ADMIN) return next();
  if (!u) { req.session.next = req.originalUrl; flash(req, 'error', 'Vui lòng đăng nhập tài khoản quản trị.'); return res.redirect('/dang-nhap'); }
  res.status(403).render('error', { title: 'Không có quyền', code: 403, message: 'Chức năng này chỉ dành cho Quản trị viên (Admin).' });
}
module.exports = { requireLogin, requireStaff, requireAdmin, isStaff };
