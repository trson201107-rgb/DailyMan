// [BACKEND A] Controller quản trị sản phẩm (Sprint 2: CRUD + Ẩn → Xóa vĩnh viễn + tìm kiếm / lọc / sắp xếp / phân trang)
const ProductModel = require('../models/ProductModel');
const CategoryModel = require('../models/CategoryModel');
const VariantModel = require('../models/VariantModel');
const C = require('../config/constants');
const { AppError, userError } = require('../utils/errors');
const { toInt, toPrice, pageInfo, pageMeta, safeImg } = require('../utils/helpers');
const { log } = require('../utils/logger');
const { flash } = require('../middlewares/common');

const uid = (req) => req.session.user.id;
const who = (req) => req.session.user.email;

/** Kiểm tra dữ liệu form ở phía máy chủ (không tin giao diện) */
function parseProduct(body) {
  const e = [];
  const p = {
    ten: String(body.ten || '').trim(), moTa: String(body.moTa || '').trim().slice(0, 1000) || null,
    gia: toPrice(body.gia), maDM: toInt(body.maDM), anh: safeImg(body.anh),
    trangThai: body.trangThai === C.SP.AN ? C.SP.AN : C.SP.BAN
  };
  if (!p.ten) e.push('Tên sản phẩm không được để trống.');
  if (p.ten.length > 150) e.push('Tên sản phẩm tối đa 150 ký tự.');
  if (!Number.isInteger(p.gia) || p.gia <= 0) e.push('Giá bán phải là số nguyên lớn hơn 0.');
  if (!p.maDM) e.push('Vui lòng chọn danh mục.');
  return { p, errors: e };
}
function parseVariants(body) {
  const e = []; const out = []; const seen = new Set();
  Object.values(body.bienthe || {}).forEach((r, i) => {
    const maMau = toInt(r.mau), maSize = toInt(r.size), ton = toInt(r.ton, 0);
    const sku = String(r.sku || '').trim().toUpperCase().slice(0, 30);
    if (!maMau && !maSize && !sku) return;                      // dòng trống => bỏ qua
    if (!maMau || !maSize) { e.push(`Biến thể dòng ${i + 1}: phải chọn đủ màu và size.`); return; }
    if (ton < 0) { e.push(`Biến thể dòng ${i + 1}: tồn kho phải >= 0.`); return; }
    const k = maMau + '-' + maSize;
    if (seen.has(k)) { e.push(`Biến thể dòng ${i + 1}: trùng màu + size.`); return; }
    seen.add(k); out.push({ maMau, maSize, ton, sku });
  });
  return { variants: out, errors: e };
}

exports.list = async (req, res) => {
  const f = {
    q: String(req.query.q || '').trim().slice(0, 100), dm: toInt(req.query.dm),
    trangThai: String(req.query.trangThai || ''), sort: String(req.query.sort || 'cap-nhat')
  };
  const pg = pageInfo(req, C.ADMIN_PAGE_SIZE);
  const [data, categories, counts] = await Promise.all([ProductModel.searchAdmin(f, pg), CategoryModel.list(), ProductModel.counts()]);
  res.render('admin/products', { title: 'Quản lý sản phẩm', items: data.items, meta: pageMeta(data.total, pg.page, pg.size), f, categories, counts });
};

exports.detail = async (req, res) => {
  const id = toInt(req.params.id);
  const product = id ? await ProductModel.findById(id) : null;
  if (!product) return res.status(404).render('error', { title: 'Không tìm thấy', code: 404, message: 'Không tìm thấy sản phẩm.' });
  const [variants, colors, sizes] = await Promise.all([VariantModel.byProduct(id), VariantModel.colors(), VariantModel.sizes()]);
  res.render('admin/product-detail', { title: product.TenSP, p: product, variants, colors, sizes });
};

async function formData() {
  const [categories, colors, sizes] = await Promise.all([CategoryModel.list(), VariantModel.colors(), VariantModel.sizes()]);
  return { categories, colors, sizes };
}

exports.newForm = async (req, res) => {
  res.render('admin/product-form', {
    title: 'Thêm sản phẩm', mode: 'new', errors: [], ...(await formData()),
    form: { ten: '', moTa: '', gia: '', maDM: '', anh: '', trangThai: C.SP.BAN }, rows: [{}, {}, {}]
  });
};

exports.create = async (req, res) => {
  const a = parseProduct(req.body); const b = parseVariants(req.body);
  const errors = [...a.errors, ...b.errors];
  if (a.p.trangThai === C.SP.BAN && !b.variants.length) errors.push('Sản phẩm "Đang bán" cần ít nhất một biến thể (màu + size).');
  if (!errors.length && !(await CategoryModel.findById(a.p.maDM))) errors.push('Danh mục không tồn tại.');
  if (!errors.length) {
    try {
      const id = await ProductModel.create(a.p, b.variants, uid(req));
      log('SP_TAO', { maSP: id, ten: a.p.ten, gia: a.p.gia }, who(req));
      flash(req, 'success', 'Đã thêm sản phẩm mới.');
      return res.redirect('/admin/san-pham/' + id);
    } catch (e) { if (e instanceof AppError) errors.push(e.message); else throw e; }
  }
  res.status(400).render('admin/product-form', {
    title: 'Thêm sản phẩm', mode: 'new', errors, ...(await formData()),
    form: { ten: req.body.ten, moTa: req.body.moTa, gia: req.body.gia, maDM: req.body.maDM, anh: req.body.anh, trangThai: a.p.trangThai },
    rows: Object.values(req.body.bienthe || {}).length ? Object.values(req.body.bienthe) : [{}, {}, {}]
  });
};

exports.editForm = async (req, res) => {
  const id = toInt(req.params.id);
  const p = id ? await ProductModel.findById(id) : null;
  if (!p) return res.status(404).render('error', { title: 'Không tìm thấy', code: 404, message: 'Không tìm thấy sản phẩm.' });
  res.render('admin/product-form', {
    title: 'Sửa sản phẩm', mode: 'edit', id, errors: [], ...(await formData()),
    form: { ten: p.TenSP, moTa: p.MoTa || '', gia: p.GiaBan, maDM: p.MaDM, anh: p.AnhDaiDien || '', trangThai: p.TrangThai }, rows: []
  });
};

exports.update = async (req, res) => {
  const id = toInt(req.params.id); const { p, errors } = parseProduct(req.body);
  if (!errors.length && !(await CategoryModel.findById(p.maDM))) errors.push('Danh mục không tồn tại.');
  if (errors.length) {
    return res.status(400).render('admin/product-form', {
      title: 'Sửa sản phẩm', mode: 'edit', id, errors, ...(await formData()),
      form: { ten: req.body.ten, moTa: req.body.moTa, gia: req.body.gia, maDM: req.body.maDM, anh: req.body.anh, trangThai: p.trangThai }, rows: []
    });
  }
  try {
    const oldPrice = await ProductModel.update(id, p, uid(req));
    if (Number(oldPrice) !== p.gia) log('SP_DOI_GIA', { maSP: id, tu: oldPrice, den: p.gia }, who(req));
    log('SP_SUA', { maSP: id }, who(req));
    flash(req, 'success', 'Đã cập nhật sản phẩm.');
    res.redirect('/admin/san-pham/' + id);
  } catch (e) { userError(req, res, e, '/admin/san-pham'); }
};

exports.hide = async (req, res) => {
  const id = toInt(req.params.id);
  try { await ProductModel.hide(id, uid(req)); log('SP_AN', { maSP: id }, who(req)); flash(req, 'success', 'Đã ẩn sản phẩm (Ngừng bán). Khách sẽ không thấy sản phẩm này.'); res.redirect(req.get('referer') || '/admin/san-pham'); }
  catch (e) { userError(req, res, e, '/admin/san-pham'); }
};
exports.show = async (req, res) => {
  const id = toInt(req.params.id);
  try { await ProductModel.show(id, uid(req)); log('SP_HIEN', { maSP: id }, who(req)); flash(req, 'success', 'Đã hiển thị lại sản phẩm (Đang bán).'); res.redirect(req.get('referer') || '/admin/san-pham'); }
  catch (e) { userError(req, res, e, '/admin/san-pham'); }
};
exports.remove = async (req, res) => {
  const id = toInt(req.params.id);
  try { await ProductModel.remove(id); log('SP_XOA_VINH_VIEN', { maSP: id }, who(req)); flash(req, 'success', 'Đã xóa vĩnh viễn sản phẩm.'); res.redirect('/admin/san-pham'); }
  catch (e) { userError(req, res, e, '/admin/san-pham'); }
};

// ---- Biến thể & tồn kho ----
exports.addVariant = async (req, res) => {
  const id = toInt(req.params.id); const back = '/admin/san-pham/' + id;
  const maMau = toInt(req.body.mau); const maSize = toInt(req.body.size); const ton = toInt(req.body.ton, 0);
  const sku = String(req.body.sku || '').trim().toUpperCase().slice(0, 30) || `SP${id}-M${maMau}-S${maSize}`;
  if (!maMau || !maSize) { flash(req, 'error', 'Vui lòng chọn đủ màu và size.'); return res.redirect(back); }
  if (ton < 0) { flash(req, 'error', 'Tồn kho phải >= 0.'); return res.redirect(back); }
  try { await VariantModel.add(id, { sku, ton, maMau, maSize }); log('BT_THEM', { maSP: id, sku }, who(req)); flash(req, 'success', 'Đã thêm biến thể.'); res.redirect(back); }
  catch (e) { userError(req, res, e, back); }
};
exports.setStock = async (req, res) => {
  const maBT = toInt(req.params.id); const ton = toInt(req.body.ton);
  const v = await VariantModel.findById(maBT);
  const back = v ? '/admin/san-pham/' + v.MaSP : '/admin/san-pham';
  if (ton === null || ton < 0) { flash(req, 'error', 'Số lượng tồn phải là số nguyên >= 0.'); return res.redirect(back); }
  try {
    const old = await VariantModel.setStock(maBT, ton);
    log('TON_KHO', { maBT, sku: v.SKU, tu: old, den: ton }, who(req));
    flash(req, 'success', `Đã cập nhật tồn kho ${v.SKU}: ${old} → ${ton}.`); res.redirect(back);
  } catch (e) { userError(req, res, e, back); }
};
exports.removeVariant = async (req, res) => {
  const maBT = toInt(req.params.id); const v = await VariantModel.findById(maBT);
  const back = v ? '/admin/san-pham/' + v.MaSP : '/admin/san-pham';
  try { await VariantModel.remove(maBT); log('BT_XOA', { maBT }, who(req)); flash(req, 'success', 'Đã xóa biến thể.'); res.redirect(back); }
  catch (e) { userError(req, res, e, back); }
};
