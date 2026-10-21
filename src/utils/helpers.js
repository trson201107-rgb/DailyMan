const { PAGE_SIZE } = require('../config/constants');

const TZ = process.env.DISPLAY_TZ || 'UTC';
const money = (n) => (Number(n) || 0).toLocaleString('vi-VN') + 'đ';
const fmtDate = (d, withTime = true) => {
  if (!d) return '';
  const o = { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' };
  if (withTime) Object.assign(o, { hour: '2-digit', minute: '2-digit', hour12: false });
  return new Date(d).toLocaleString('vi-VN', o);
};
/** Escape ký tự đặc biệt của LIKE trong SQL Server */
const likeEsc = (s) => '%' + String(s).trim().replace(/[\[%_]/g, (c) => '[' + c + ']') + '%';
const toInt = (v, def = null) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : def; };
const toPrice = (v) => { const n = Number(String(v ?? '').replace(/[.,\s]/g, '')); return Number.isFinite(n) ? n : NaN; };

function pageInfo(req, size = PAGE_SIZE) {
  const page = Math.max(1, toInt(req.query.page, 1));
  return { page, size, offset: (page - 1) * size };
}
function pageMeta(total, page, size) {
  const totalPages = Math.max(1, Math.ceil(total / size));
  return { total, page: Math.min(page, totalPages), size, totalPages };
}
/** Chỉ cho phép ảnh là đường dẫn nội bộ hoặc http(s) */
const safeImg = (u) => { u = (u || '').trim(); return /^(https?:\/\/|\/)/i.test(u) ? u.slice(0, 255) : null; };

module.exports = { money, fmtDate, likeEsc, toInt, toPrice, pageInfo, pageMeta, safeImg };
