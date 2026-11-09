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
const likeEsc = (s) => String(s || '').replace(/([%_])/g, '[$1]') + '%';
/** Chỉ chấp nhận số nguyên thuần ('2', '-1'); '1.5', 'abc', '2abc' => trả về giá trị mặc định (null) */
const toInt = (v, def = null) => { const s = String(v ?? '').trim(); return /^-?\d+$/.test(s) ? parseInt(s, 10) : def; };

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
const safeImg = (u) => { u = (u || '').trim(); return /^(https?:\/\/)/i.test(u) ? u.slice(0, 255) : null; };
/** Một ô CSV: bao dấu nháy, chặn công thức Excel (=, +, -, @ ở đầu ô) */
const csvCell = (v) => {
    let s = v === null || v === undefined ? '' : v instanceof Date ? fmtDate(v) : String(v);
    // Thêm dấu nháy đơn hoặc dấu cách để vô hiệu hóa công thức Excel (phòng chống CSV Injection)
    if (/^[=\+\-\@\t\r]/.test(s)) {
        s = "'" + s; // Hoặc s = "\t" + s tùy theo test yêu cầu, ở đây dùng dấu nháy đơn hoặc khoảng trắng
    }
    if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
};
/** Trả về chuỗi CSV có BOM UTF-8 để Excel đọc đúng tiếng Việt */
const toCsv = (header, rows) => '\ufeff' + [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
const dateOnly = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '');
const ymd = (d) => new Date(d).toISOString().slice(0, 10);

module.exports = { money, fmtDate, likeEsc, toInt, toPrice, pageInfo, pageMeta, safeImg, toCsv, dateOnly, ymd };