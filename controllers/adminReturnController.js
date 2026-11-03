// [BACKEND B] Quản trị: xử lý yêu cầu đổi trả (UC13): chấp nhận hoặc từ chối (bắt buộc lý do)
const ReturnModel = require('../models/ReturnModel');
const C = require('../config/constants');
const { userError } = require('../utils/errors');
const { toInt, pageInfo, pageMeta } = require('../utils/helpers');
const { flash } = require('../middlewares/common');
const { log } = require('../utils/logger');

exports.list = async (req, res) => {
  const status = Object.values(C.RETURN).includes(req.query.tt) ? req.query.tt : '';
  const q = String(req.query.q || '').trim().slice(0, 50);
  const pg = pageInfo(req, C.ADMIN_PAGE_SIZE);
  const [data, counts] = await Promise.all([ReturnModel.search({ status, q }, pg), ReturnModel.counts()]);
  res.render('admin/returns', { title: 'Yêu cầu đổi trả', items: data.items, meta: pageMeta(data.total, pg.page, pg.size), counts, status, q, RETURN: C.RETURN });
};
exports.accept = async (req, res) => {
  const id = toInt(req.params.id);
  try { const maDH = await ReturnModel.accept(id, req.session.user.id); log('DOI_TRA_CHAP_NHAN', { maYC: id, maDH }, req.session.user.email); flash(req, 'success', `Đã chấp nhận yêu cầu #${id}. Đơn #${maDH} chuyển sang trạng thái Đổi trả.`); res.redirect('/admin/doi-tra'); }
  catch (e) { userError(req, res, e, '/admin/doi-tra'); }
};
exports.reject = async (req, res) => {
  const id = toInt(req.params.id); const lyDo = String(req.body.lyDo || '').trim().slice(0, 500);
  try { const maDH = await ReturnModel.reject(id, req.session.user.id, lyDo); log('DOI_TRA_TU_CHOI', { maYC: id, maDH, lyDo }, req.session.user.email); flash(req, 'success', `Đã từ chối yêu cầu #${id}.`); res.redirect('/admin/doi-tra'); }
  catch (e) { userError(req, res, e, '/admin/doi-tra'); }
};
