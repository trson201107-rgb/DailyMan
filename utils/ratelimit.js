// Giới hạn số lần gọi theo IP (trong bộ nhớ) – chống gửi email hàng loạt / dò mật khẩu
const hits = new Map();
module.exports = function limit({ windowMs = 15 * 60 * 1000, max = 5, message = 'Bạn thao tác quá nhiều lần, vui lòng thử lại sau.' } = {}) {
  return (req, res, next) => {
    const key = req.ip + '|' + req.path; const now = Date.now();
    const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (arr.length >= max) { req.session.flash = { type: 'error', msg: message }; return res.redirect(req.get('referer') || req.originalUrl); }
    arr.push(now); hits.set(key, arr);
    if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
    next();
  };
};
