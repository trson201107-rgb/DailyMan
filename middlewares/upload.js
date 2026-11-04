// Nhận tệp ảnh tải lên (lưu tạm trong bộ nhớ, tối đa vài MB); lỗi thì báo bằng flash thay vì sập trang
const multer = require('multer');
const C = require('../config/constants');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: C.MAX_IMAGE_MB * 1024 * 1024, files: 1 } });

module.exports = (field) => (req, res, next) => upload.single(field)(req, res, (err) => {
  if (!err) return next();
  const msg = err.code === 'LIMIT_FILE_SIZE' ? `Ảnh quá lớn, tối đa ${C.MAX_IMAGE_MB}MB.` : 'Không đọc được tệp tải lên.';
  req.session.flash = { type: 'error', msg };
  res.redirect(req.get('referer') || '/admin/san-pham');
});
