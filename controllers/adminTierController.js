// [BACKEND B] Quản trị hạng thành viên (UC15): cấu hình ngưỡng chi tiêu, % ưu đãi, bật/tắt ưu đãi khi thanh toán, tính lại hạng
const TierModel = require('../models/TierModel');
const { userError } = require('../utils/errors');
const { toInt, toPrice } = require('../utils/helpers');
const { flash } = require('../middlewares/common');
const { log } = require('../utils/logger');

exports.view = async (req, res) => {
  const [tiers, bat] = await Promise.all([TierModel.list(), TierModel.enabled()]);
  res.render('admin/tiers', { title: 'Hạng thành viên', tiers, bat });
};
exports.save = async (req, res) => {
  const rows = Object.values(req.body.hang || {}).map((r) => ({ id: toInt(r.id), ten: String(r.ten || ''), chiTieu: toPrice(r.chiTieu), pct: toInt(r.pct) }));
  try { await TierModel.saveAll(rows); log('HANG_CAU_HINH', rows.length + ' hạng', req.session.user.email); flash(req, 'success', 'Đã lưu cấu hình hạng thành viên.'); res.redirect('/admin/hang-thanh-vien'); }
  catch (e) { userError(req, res, e, '/admin/hang-thanh-vien'); }
};
exports.toggle = async (req, res) => {
  const on = req.body.bat === '1'; await TierModel.setEnabled(on); log('HANG_UU_DAI', on ? 'bật' : 'tắt', req.session.user.email);
  flash(req, 'success', on ? 'Đã bật ưu đãi hạng thành viên khi thanh toán.' : 'Đã tắt ưu đãi hạng thành viên.'); res.redirect('/admin/hang-thanh-vien');
};
exports.recompute = async (req, res) => {
  const n = await TierModel.recomputeAll(); log('HANG_TINH_LAI', n + ' khách', req.session.user.email);
  flash(req, 'success', `Đã tính lại hạng cho ${n} khách hàng theo tổng chi tiêu (đơn Hoàn thành).`); res.redirect('/admin/hang-thanh-vien');
};
