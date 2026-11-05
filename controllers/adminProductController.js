// [BACKEND A] Controller quản trị sản phẩm (Sprint 2: CRUD + Ẩn → Xóa vĩnh viễn + tìm kiếm / lọc / sắp xếp / phân trang)
const ProductModel = require('../models/ProductModel');
const CategoryModel = require('../models/CategoryModel');
const VariantModel = require('../models/VariantModel');
const ImageModel = require('../models/ImageModel');
const C = require('../config/constants');
const { AppError, userError } = require('../utils/errors');
const { toInt, toPrice, pageInfo, pageMeta, safeImg, toCsv } = require('../utils/helpers');
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
    giaGoc: body.giaGoc === undefined || String(body.giaGoc).trim() === '' ? null : toPrice(body.giaGoc),
    trangThai: body.trangThai === C.SP.AN ? C.SP.AN : C.SP.BAN
  };
  if (!p.ten) e.push('Tên sản phẩm không được để trống.');
  if (p.ten.length > 150) e.push('Tên sản phẩm tối đa 150 ký tự.');
  if (!Number.isInteger(p.gia) || p.gia <= 0) e.push('Giá bán phải là số nguyên lớn hơn 0.');
  if (!p.maDM) e.push('Vui lòng chọn danh mục.');
  if (p.giaGoc !== null && (!Number.isInteger(p.giaGoc) || p.giaGoc < p.gia)) e.push('Giá gốc phải là số nguyên lớn hơn hoặc bằng giá bán (hoặc để trống nếu không giảm giá).');
  return { p, errors: e };
}
function parseVariants(body) {
  const e = []; const out = []; const seen = new Set();
  Object.values(body.bienthe || {}).forEach((r, i) => {
    const maMau = toInt(r.mau), maSize = toInt(r.size), ton = (r.ton === '' || r.ton === undefined) ? 0 : toInt(r.ton);
    const sku = String(r.sku || '').trim().toUpperCase().slice(0, 30);
    if (!maMau && !maSize && !sku) return;                      // dòng trống => bỏ qua
    if (!maMau || !maSize) { e.push(`Biến thể dòng ${i + 1}: phải chọn đủ màu và size.`); return; }
    if (ton === null || ton < 0) { e.push(`Biến thể dòng ${i + 1}: tồn kho phải là số nguyên >= 0.`); return; }
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
  const [variants, colors, sizes, images, history] = await Promise.all([VariantModel.byProduct(id), VariantModel.colors(), VariantModel.sizes(), ImageModel.list(id), VariantModel.history(id)]);
  res.render('admin/product-detail', { title: product.TenSP, p: product, variants, colors, sizes, images, history, MAX_IMAGES: C.MAX_IMAGES });
};

async function formData() {
  const [categories, colors, sizes] = await Promise.all([CategoryModel.list(), VariantModel.colors(), VariantModel.sizes()]);
  return { categories, colors, sizes };
}

exports.newForm = async (req, res) => {
  res.render('admin/product-form', {
    title: 'Thêm sản phẩm', mode: 'new', errors: [], ...(await formData()),
    form: { ten: '', moTa: '', gia: '', giaGoc: '', maDM: '', anh: '', trangThai: C.SP.BAN }, rows: [{}, {}, {}]
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
    form: { ten: req.body.ten, moTa: req.body.moTa, gia: req.body.gia, giaGoc: req.body.giaGoc, maDM: req.body.maDM, anh: req.body.anh, trangThai: a.p.trangThai },
    rows: Object.values(req.body.bienthe || {}).length ? Object.values(req.body.bienthe) : [{}, {}, {}]
  });
};

exports.editForm = async (req, res) => {
  const id = toInt(req.params.id);
  const p = id ? await ProductModel.findById(id) : null;
  if (!p) return res.status(404).render('error', { title: 'Không tìm thấy', code: 404, message: 'Không tìm thấy sản phẩm.' });
  res.render('admin/product-form', {
    title: 'Sửa sản phẩm', mode: 'edit', id, errors: [], ...(await formData()),
    form: { ten: p.TenSP, moTa: p.MoTa || '', gia: p.GiaBan, giaGoc: p.GiaGoc || '', maDM: p.MaDM, anh: p.AnhDaiDien || '', trangThai: p.TrangThai }, rows: []
  });
};

exports.update = async (req, res) => {
  const id = toInt(req.params.id); const { p, errors } = parseProduct(req.body);
  if (!errors.length && !(await CategoryModel.findById(p.maDM))) errors.push('Danh mục không tồn tại.');
  if (errors.length) {
    return res.status(400).render('admin/product-form', {
      title: 'Sửa sản phẩm', mode: 'edit', id, errors, ...(await formData()),
      form: { ten: req.body.ten, moTa: req.body.moTa, gia: req.body.gia, giaGoc: req.body.giaGoc, maDM: req.body.maDM, anh: req.body.anh, trangThai: p.trangThai }, rows: []
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
  const maMau = toInt(req.body.mau); const maSize = toInt(req.body.size); const ton = (req.body.ton === '' || req.body.ton === undefined) ? 0 : toInt(req.body.ton);
  const sku = String(req.body.sku || '').trim().toUpperCase().slice(0, 30) || `SP${id}-M${maMau}-S${maSize}`;
  if (!maMau || !maSize) { flash(req, 'error', 'Vui lòng chọn đủ màu và size.'); return res.redirect(back); }
  if (ton === null || ton < 0) { flash(req, 'error', 'Tồn kho phải là số nguyên >= 0.'); return res.redirect(back); }
  try { await VariantModel.add(id, { sku, ton, maMau, maSize }); log('BT_THEM', { maSP: id, sku }, who(req)); flash(req, 'success', 'Đã thêm biến thể.'); res.redirect(back); }
  catch (e) { userError(req, res, e, back); }
};
exports.setStock = async (req, res) => {
  const maBT = toInt(req.params.id);
  const v = await VariantModel.findById(maBT);
  const back = v ? '/admin/san-pham/' + v.MaSP : '/admin/san-pham';
  const loai = ['nhap', 'kiemke'].includes(req.body.loai) ? req.body.loai : 'dieuchinh';
  const so = toInt(req.body.so !== undefined ? req.body.so : req.body.ton);
  const ghiChu = String(req.body.ghiChu || '').trim().slice(0, 255);
  try {
    const r = await VariantModel.adjust(maBT, { loai, so, ghiChu }, uid(req));
    log('TON_KHO', { maBT, sku: v && v.SKU, thaoTac: r.nhan, tu: r.cu, den: r.moi }, who(req));
    flash(req, 'success', `${r.nhan} ${v.SKU}: tồn kho ${r.cu} → ${r.moi}.`); res.redirect(back);
  } catch (e) { userError(req, res, e, back); }
};
exports.removeVariant = async (req, res) => {
  const maBT = toInt(req.params.id); const v = await VariantModel.findById(maBT);
  const back = v ? '/admin/san-pham/' + v.MaSP : '/admin/san-pham';
  try { await VariantModel.remove(maBT); log('BT_XOA', { maBT }, who(req)); flash(req, 'success', 'Đã xóa biến thể.'); res.redirect(back); }
  catch (e) { userError(req, res, e, back); }
};

// ---- Hình ảnh sản phẩm: nhiều ảnh (tải lên hoặc URL), đặt ảnh chính, xóa ----
const MAGIC = [['image/jpeg', [0xff, 0xd8, 0xff]], ['image/png', [0x89, 0x50, 0x4e, 0x47]], ['image/gif', [0x47, 0x49, 0x46, 0x38]]];
function sniff(buf) {                                            // xác định loại ảnh theo nội dung thật, không tin tên tệp
  for (const [mime, sig] of MAGIC) if (sig.every((b, i) => buf[i] === b)) return mime;
  if (buf.length > 12 && buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'image/webp';
  return null;
}
exports.addImage = async (req, res) => {
  const id = toInt(req.params.id); const back = '/admin/san-pham/' + id;
  try {
    if (req.file) {
      const mime = sniff(req.file.buffer);
      if (!mime) throw new AppError('Tệp không phải ảnh hợp lệ (chỉ nhận JPG, PNG, GIF, WEBP).');
      await ImageModel.addFile(id, req.file.buffer, mime);
    } else {
      const url = safeImg(req.body.url);
      if (!url) throw new AppError('Vui lòng chọn tệp ảnh hoặc nhập đường dẫn ảnh (http/https).');
      await ImageModel.addUrl(id, url);
    }
    log('ANH_THEM', { maSP: id }, who(req)); flash(req, 'success', 'Đã thêm ảnh.'); res.redirect(back);
  } catch (e) { userError(req, res, e, back); }
};
exports.removeImage = async (req, res) => {
  const id = toInt(req.params.id); await ImageModel.remove(toInt(req.params.anh), id);
  log('ANH_XOA', { maSP: id, maAnh: req.params.anh }, who(req)); flash(req, 'success', 'Đã xóa ảnh.'); res.redirect('/admin/san-pham/' + id);
};
exports.mainImage = async (req, res) => {
  const id = toInt(req.params.id); await ImageModel.setMain(toInt(req.params.anh), id);
  flash(req, 'success', 'Đã đặt làm ảnh chính.'); res.redirect('/admin/san-pham/' + id);
};

// ---- Xuất danh sách sản phẩm ra CSV (theo bộ lọc đang chọn) ----
exports.exportCsv = async (req, res) => {
  const f = { q: String(req.query.q || '').trim().slice(0, 100), dm: toInt(req.query.dm), trangThai: String(req.query.trangThai || ''), sort: String(req.query.sort || 'cap-nhat') };
  const rows = await ProductModel.exportAll(f);
  const csv = toCsv(['Mã SP', 'Tên sản phẩm', 'Danh mục', 'Giá bán (đ)', 'Giá gốc (đ)', 'Trạng thái', 'Tổng tồn', 'Số biến thể', 'Lượt xem', 'Ngày tạo', 'Ngày cập nhật'],
    rows.map((p) => [p.MaSP, p.TenSP, p.TenDM, p.GiaBan, p.GiaGoc, p.TrangThai, p.TongTon, p.SoBienThe, p.LuotXem, p.NgayTao, p.NgayCapNhat]));
  log('XUAT_SAN_PHAM', { soDong: rows.length }, who(req));
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="san-pham.csv"' }).send(csv);
};
