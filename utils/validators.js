// Kiểm tra dữ liệu dùng chung ở phía máy chủ
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^0\d{9,10}$/;

/** Địa chỉ giao hàng gồm: người nhận, SĐT, tỉnh/thành, quận/huyện, địa chỉ cụ thể. Trả về { a, errors } */
function parseAddress(b) {
  const a = {
    ten: String(b.ten || '').trim(), sdt: String(b.sdt || '').trim().replace(/[\s.\-]/g, ''),
    tinh: String(b.tinh || '').trim(), quan: String(b.quan || '').trim(), cuThe: String(b.cuThe || '').trim()
  };
  const errors = [];
  if (a.ten.length < 2 || a.ten.length > 100) errors.push('Vui lòng nhập họ tên người nhận (2–100 ký tự).');
  if (!PHONE_RE.test(a.sdt)) errors.push('Số điện thoại người nhận không hợp lệ (bắt đầu bằng 0, 10–11 chữ số).');
  if (!a.tinh || a.tinh.length > 50) errors.push('Vui lòng chọn hoặc nhập Tỉnh/Thành phố.');
  if (!a.quan || a.quan.length > 50) errors.push('Vui lòng nhập Quận/Huyện.');
  if (a.cuThe.length < 5 || a.cuThe.length > 150) errors.push('Vui lòng nhập địa chỉ cụ thể (số nhà, đường, phường/xã).');
  return { a, errors };
}
/** Chỉ cho phép quay lại các trang nội bộ đã biết (tránh chuyển hướng ra ngoài) */
const safeNext = (n) => (['/thanh-toan', '/tai-khoan/dia-chi'].includes(n) ? n : '/tai-khoan/dia-chi');

module.exports = { EMAIL_RE, PHONE_RE, parseAddress, safeNext };
