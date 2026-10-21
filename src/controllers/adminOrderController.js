// [BACKEND B] Quản trị đơn hàng (Staff + Admin), Dashboard, tài khoản
const OrderModel = require('../models/OrderModel');
const StatsModel = require('../models/StatsModel');
const UserModel = require('../models/UserModel');
const C = require('../config/constants');
const { userError } = require('../utils/errors');
const { toInt, pageInfo, pageMeta } = require('../utils/helpers');
const { flash } = require('../middlewares/common');
const { log } = require('../utils/logger');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

exports.dashboard = async (req, res) => {
  if (req.session.user.role !== C.ROLE.ADMIN) return res.redirect('/admin/don-hang');
  const [sum, rev, best, recent, low] = await Promise.all([
    StatsModel.summary(), StatsModel.revenue7days(), StatsModel.bestSellers(), StatsModel.recentOrders(), StatsModel.lowStockVariants()
  ]);
  const max = Math.max(1, ...rev.map((r) => Number(r.DoanhThu)));
  res.render('admin/dashboard', { title: 'Tổng quan', sum, rev, max, best, recent, low });
};

exports.orders = async (req, res) => {
  const f = {
    status: toInt(req.query.tt), q: String(req.query.q || '').trim().slice(0, 50),
    tu: DATE_RE.test(req.query.tu || '') ? req.query.tu : '', den: DATE_RE.test(req.query.den || '') ? req.query.den : ''
  };
  const pg = pageInfo(req, C.ADMIN_PAGE_SIZE);
  const [data, counts, statuses] = await Promise.all([OrderModel.search(f, pg), OrderModel.statusCounts(null), OrderModel.statuses()]);
  res.render('admin/orders', { title: 'Quản lý đơn hàng', items: data.items, meta: pageMeta(data.total, pg.page, pg.size), counts, statuses, f });
};

exports.orderDetail = async (req, res) => {
  const o = await OrderModel.detail(toInt(req.params.id));
  if (!o) return res.status(404).render('error', { title: 'Không tìm thấy', code: 404, message: 'Không tìm thấy đơn hàng.' });
  res.render('admin/order-detail', { title: 'Đơn hàng #' + o.MaDH, o, S: C.STATUS });
};

exports.advance = async (req, res) => {
  const id = toInt(req.params.id);
  try {
    const r = await OrderModel.advance(id, req.session.user.id);
    log('DOI_TRANG_THAI_DON', { maDH: id, tu: r.from, den: r.next }, req.session.user.email);
    flash(req, 'success', 'Đã cập nhật trạng thái đơn #' + id + '.'); res.redirect(req.get('referer') || '/admin/don-hang');
  } catch (e) { userError(req, res, e, '/admin/don-hang'); }
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

// ---- Tài khoản: Staff tra cứu khách hàng (UC17); Admin được đổi vai trò / khóa ----
exports.users = async (req, res) => {
  const f = { q: String(req.query.q || '').trim().slice(0, 50), role: Object.values(C.ROLE).includes(req.query.role) ? req.query.role : '' };
  const pg = pageInfo(req, C.ADMIN_PAGE_SIZE);
  const data = await UserModel.search(f, pg);
  res.render('admin/users', { title: 'Tài khoản', items: data.items, meta: pageMeta(data.total, pg.page, pg.size), f, roles: Object.values(C.ROLE) });
};
exports.setRole = async (req, res) => {
  const id = toInt(req.params.id); const role = req.body.role;
  if (id === req.session.user.id) { flash(req, 'error', 'Không thể tự đổi vai trò của chính mình.'); return res.redirect('/admin/tai-khoan'); }
  if (!Object.values(C.ROLE).includes(role)) { flash(req, 'error', 'Vai trò không hợp lệ.'); return res.redirect('/admin/tai-khoan'); }
  await UserModel.setRole(id, role); log('DOI_VAI_TRO', { id, role }, req.session.user.email);
  flash(req, 'success', 'Đã đổi vai trò.'); res.redirect('/admin/tai-khoan');
};
exports.setStatus = async (req, res) => {
  const id = toInt(req.params.id); const st = req.body.trangThai === 'Bị khóa' ? 'Bị khóa' : 'Hoạt động';
  if (id === req.session.user.id) { flash(req, 'error', 'Không thể tự khóa tài khoản của chính mình.'); return res.redirect('/admin/tai-khoan'); }
  await UserModel.setStatus(id, st); log('DOI_TRANG_THAI_TK', { id, st }, req.session.user.email);
  flash(req, 'success', st === 'Bị khóa' ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.'); res.redirect('/admin/tai-khoan');
};
