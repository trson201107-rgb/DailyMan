// Gửi email (quên mật khẩu). Cấu hình SMTP bằng biến môi trường; chưa cấu hình thì bỏ qua (không gửi) và trả về sent=false.
const nodemailer = require('nodemailer');
let transporter = null;
const configured = () => !!process.env.SMTP_HOST;
function getTransport() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, port: parseInt(process.env.SMTP_PORT || '587', 10), secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
    });
  }
  return transporter;
}
async function send({ to, subject, text, html }) {
  if (!configured()) return { sent: false };
  await getTransport().sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, text, html });
  return { sent: true };
}
module.exports = { send, configured };
