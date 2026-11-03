// [BACKEND B] Quản trị: Dashboard theo khoảng ngày, đơn hàng (lọc, đổi trạng thái, hàng loạt, hủy, xuất CSV)
const OrderModel = require('../models/OrderModel');
const StatsModel = require('../models/StatsModel');
const C = require('../config/constants');
const { userError, AppError } = require('../utils/errors');
const { toInt, pageInfo, pageMeta, dateOnly, ymd, toCsv } = require('../utils/helpers');
const { flash } = require('../middlewares/common');
const { log } = require('../utils/logger');

const addDays = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return ymd(x); };
const diffDays = (a, b) => Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000);

/** Khoảng thời gian báo cáo: 7 ngày / 30 ngày / tháng này / tùy chọn (tối đa 92 ngày) */
async function parseRange(req) {
  const today = ymd(await StatsModel.today());
  const q = req.query; let ky = ['7', '30', 'thang'].includes(q.ky) ? q.ky : 'thang';
  let tu; let den = today; let note = null;
  if (dateOnly(q.tu) && dateOnly(q.den)) {
    ky = 'tuy-chon'; tu = q.tu; den = q.den;
    if (tu > den) { [tu, den] = [den, tu]; note = 'Ngày bắt đầu lớn hơn ngày kết thúc nên hệ thống đã đổi chỗ hai ngày.'; }
  } else if (ky === '7') tu = addDays(today, -6);
  else if (ky === '30') tu = addDays(today, -29);
  else tu = today.slice(0, 8) + '01';
  if (diffDays(tu, den) > 91) { tu = addDays(den, -91); note = 'Khoảng thời gian tối đa là 92 ngày, hệ thống đã thu hẹp lại.'; }
  return { tu, den, ky, note, today };
}

exports.dashboard = async (req, res) => {
  if (req.session.user.role !== C.ROLE.ADMIN) return res.redirect('/admin/don-hang');
  const range = await parseRange(req);
  const [sum, rev, best, recent, low] = await Promise.all([
    StatsModel.summary(range), StatsModel.revenueDaily(range), StatsModel.bestSellers(range), StatsModel.recentOrders(range), StatsModel.lowStockVariants()
  ]);
  const max = Math.max(1, ...rev.map((r) => Number(r.DoanhThu)));
  res.render('admin/dashboard', { title: 'Tổng quan', range, sum, rev, max, best, recent, low, empty: sum.donHang === 0 && Number(sum.doanhThu) === 0 });
};

function orderFilters(req) {
  return { status: toInt(req.query.tt), q: String(req.query.q || '').trim().slice(0, 50), tu: dateOnly(req.query.tu), den: dateOnly(req.query.den) };
}

exports.orders = async (req, res) => {
  const f = orderFilters(req);
  const pg = pageInfo(req, C.ADMIN_PAGE_SIZE);
  const [data, counts, statuses] = await Promise.all([OrderModel.search(f, pg), OrderModel.statusCounts(null), OrderModel.statuses()]);
  res.render('admin/orders', { title: 'Quản lý đơn hàng', items: data.items, meta: pageMeta(data.total, pg.page, pg.size), counts, statuses, f, STATUS_NAME: C.STATUS_NAME });
};

exports.exportOrders = async (req, res) => {
  const rows = await OrderModel.exportAll(orderFilters(req));
  const csv = toCsv(['Mã đơn', 'Ngày đặt', 'Khách hàng', 'Người nhận', 'SĐT', 'Số sản phẩm', 'Tổng tiền (đ)', 'Phương thức', 'Thanh toán', 'Trạng thái đơn'],
    rows.map((o) => [o.MaDH, o.NgayDat, o.HoTen, o.TenNguoiNhan, o.SDTNguoiNhan, o.SoSanPham, o.TongThanhToan, o.TenPT, o.TrangThaiTT, o.TenTrangThai]));
  log('XUAT_DON_HANG', { soDong: rows.length }, req.session.user.email);
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="don-hang.csv"' }).send(csv);
};

exports.orderDetail = async (req, res) => {
  const o = await OrderModel.detail(toInt(req.params.id));
  if (!o) return res.status(404).render('error', { title: 'Không tìm thấy', code: 404, message: 'Không tìm thấy đơn hàng.' });
  res.render('admin/order-detail', { title: 'Đơn hàng #' + o.MaDH, o, S: C.STATUS, STATUS_NAME: C.STATUS_NAME });
};

exports.advance = async (req, res) => {
  const id = toInt(req.params.id);
  try {
    const r = await OrderModel.advance(id, req.session.user.id);
    log('DOI_TRANG_THAI_DON', { maDH: id, tu: r.from, den: r.next }, req.session.user.email);
    flash(req, 'success', 'Đã cập nhật trạng thái đơn #' + id + '.'); res.redirect(req.get('referer') || '/admin/don-hang');
  } catch (e) { userError(req, res, e, '/admin/don-hang'); }
};

/** Cập nhật nhanh nhiều đơn: chọn các đơn rồi chuyển sang trạng thái `den`. Đơn không ở ngay trước trạng thái đó bị từ chối kèm lý do */
exports.bulk = async (req, res) => {
  const back = req.get('referer') || '/admin/don-hang';
  const ids = [...new Set([].concat(req.body.ids || []).map((x) => toInt(x)).filter((x) => x !== null))];
  const den = toInt(req.body.den);
  if (!ids.length) { flash(req, 'error', 'Vui lòng chọn ít nhất một đơn hàng.'); return res.redirect(back); }
  if (![2, 3, 4, 5].includes(den)) { flash(req, 'error', 'Trạng thái đích không hợp lệ.'); return res.redirect(back); }
  let ok = 0; const loi = [];
  for (const id of ids) {
    try { await OrderModel.advance(id, req.session.user.id, den - 1); ok++; log('DOI_TRANG_THAI_DON', { maDH: id, den, hangLoat: true }, req.session.user.email); }
    catch (e) { if (e instanceof AppError) loi.push(e.message); else throw e; }
  }
  const parts = [];
  if (ok) parts.push(`Đã chuyển ${ok} đơn sang "${C.STATUS_NAME[den]}".`);
  if (loi.length) parts.push(`${loi.length} đơn không được cập nhật: ${loi.slice(0, 4).join(' ')}${loi.length > 4 ? ' …' : ''}`);
  flash(req, ok && !loi.length ? 'success' : ok ? 'info' : 'error', parts.join(' ').slice(0, 700));
  res.redirect(back);
};

exports.cancel = async (req, res) => {
  const id = toInt(req.params.id); const lyDo = String(req.body.lyDo || '').trim().slice(0, 200);
  if (!lyDo) { flash(req, 'error', 'Vui lòng nhập lý do hủy đơn.'); return res.redirect('/admin/don-hang/' + id); }
  try {
    await OrderModel.cancel(id, { allowed: [C.STATUS.CHO, C.STATUS.XAC_NHAN, C.STATUS.DONG_GOI], userId: req.session.user.id, note: 'Hủy đơn: ' + lyDo });
    log('HUY_DON', { maDH: id, lyDo }, req.session.user.email);
    flash(req, 'success', 'Đã hủy đơn #' + id + ' và hoàn lại tồn kho.'); res.redirect('/admin/don-hang/' + id);
  } catch (e) { userError(req, res, e, '/admin/don-hang/' + id); }
};
