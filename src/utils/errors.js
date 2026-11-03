// Lỗi nghiệp vụ: thông báo thẳng cho người dùng (tiếng Việt), không phải lỗi hệ thống
class AppError extends Error {
  constructor(message, status = 400) { super(message); this.name = 'AppError'; this.status = status; }
}
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
module.exports = { AppError, wrap };

/** Lỗi nghiệp vụ -> flash + quay lại trang; lỗi hệ thống -> ném tiếp cho error handler */
function userError(req, res, e, back) {
  if (e instanceof AppError) {
    req.session.flash = { type: 'error', msg: e.message };
    return res.redirect(back || req.get('referer') || '/');
  }
  throw e;
}
module.exports.userError = userError;
