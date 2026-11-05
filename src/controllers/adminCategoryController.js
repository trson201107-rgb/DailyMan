// [BACKEND A] Controller quản trị danh mục (UC18)
const CategoryModel = require('../models/CategoryModel');
const { toInt } = require('../utils/helpers');
const { userError } = require('../utils/errors');
const { flash } = require('../middlewares/common');
const { log } = require('../utils/logger');

exports.list = async (req, res) => {
  const items = await CategoryModel.list();
  const editing = toInt(req.query.sua) ? items.find((x) => x.MaDM === toInt(req.query.sua)) : null;
  res.render('admin/categories', { title: 'Quản lý danh mục', items, editing });
};
exports.create = async (req, res) => {
  const ten = String(req.body.ten || '').trim().slice(0, 50);
  if (!ten) { flash(req, 'error', 'Tên danh mục không được để trống.'); return res.redirect('/admin/danh-muc'); }
  try { await CategoryModel.create({ ten, moTa: String(req.body.moTa || '').trim().slice(0, 255) || null }); log('DM_TAO', ten, req.session.user.email); flash(req, 'success', 'Đã thêm danh mục.'); res.redirect('/admin/danh-muc'); }
  catch (e) { userError(req, res, e, '/admin/danh-muc'); }
};
exports.update = async (req, res) => {
  const id = toInt(req.params.id); const ten = String(req.body.ten || '').trim().slice(0, 50);
  if (!ten) { flash(req, 'error', 'Tên danh mục không được để trống.'); return res.redirect('/admin/danh-muc?sua=' + id); }
  try { await CategoryModel.update(id, { ten, moTa: String(req.body.moTa || '').trim().slice(0, 255) || null }); flash(req, 'success', 'Đã cập nhật danh mục.'); res.redirect('/admin/danh-muc'); }
  catch (e) { userError(req, res, e, '/admin/danh-muc'); }
};
exports.remove = async (req, res) => {
  try { await CategoryModel.remove(toInt(req.params.id)); log('DM_XOA', req.params.id, req.session.user.email); flash(req, 'success', 'Đã xóa danh mục.'); res.redirect('/admin/danh-muc'); }
  catch (e) { userError(req, res, e, '/admin/danh-muc'); }
};
