// Header bảo mật cơ bản + chặn POST từ trang web khác (kiểm tra Origin) để chống CSRF
module.exports = function security(req, res, next) {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'SAMEORIGIN', 'Referrer-Policy': 'strict-origin-when-cross-origin' });
  if (req.method === 'POST') {
    const origin = req.get('origin');
    if (origin) {
      let ok = false;
      try { ok = new URL(origin).host === req.get('host'); } catch (_) { ok = false; }
      if (!ok) return res.status(403).send('Yêu cầu bị từ chối: nguồn gửi không hợp lệ.');
    }
  }
  next();
};
