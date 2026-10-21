// Cấu hình ứng dụng Express (MVC): routes -> controllers -> models -> views
require('dotenv').config();
const path = require('path');
const express = require('express');
const cookieSession = require('cookie-session');
const common = require('./middlewares/common');
const { log } = require('./utils/logger');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);                       // chạy sau proxy của Render/Heroku...
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true, limit: '200kb' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));
app.use(cookieSession({
  name: 'dm_sess',
  keys: [process.env.SESSION_SECRET || 'dev-secret-doi-khi-chay-that'],
  maxAge: 7 * 24 * 3600 * 1000,
  httpOnly: true, sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production'
}));
app.get('/healthz', (req, res) => res.send('ok'));
app.use(common.locals);
app.use(common.cartBadge);
app.use(require('./routes'));

app.use((req, res) => res.status(404).render('error', { title: 'Không tìm thấy', code: 404, message: 'Trang bạn tìm không tồn tại.' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const known = err && err.name === 'AppError';
  if (!known) log('LOI_HE_THONG', (err && err.stack) || String(err));
  res.status(known ? err.status : 500).render('error', {
    title: 'Có lỗi xảy ra', code: known ? err.status : 500,
    message: known ? err.message : 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.'
  });
});
module.exports = app;
