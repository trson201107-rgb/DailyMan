// [BACKEND A] Controller phía khách: trang chủ, danh sách (tìm kiếm / lọc / sắp xếp / phân trang), chi tiết sản phẩm
const ProductModel = require('../models/ProductModel');
const CategoryModel = require('../models/CategoryModel');
const VariantModel = require('../models/VariantModel');
const { toInt, toPrice, pageInfo, pageMeta } = require('../utils/helpers');

function parseFilters(q) {
  const f = {
    q: String(q.q || '').trim().slice(0, 100),
    dm: toInt(q.dm), mau: toInt(q.mau), size: toInt(q.size),
    conHang: q.conHang === '1',
    tag: ['hot', 'moi'].includes(q.tag) ? q.tag : '',
    sort: String(q.sort || 'moi')
  };
  const min = q.giaMin !== undefined && q.giaMin !== '' ? toPrice(q.giaMin) : null;
  const max = q.giaMax !== undefined && q.giaMax !== '' ? toPrice(q.giaMax) : null;
  f.giaMin = Number.isFinite(min) && min >= 0 ? min : null;
  f.giaMax = Number.isFinite(max) && max >= 0 ? max : null;
  return f;
}

exports.home = async (req, res) => {
  const [categories, hot, newest] = await Promise.all([
    CategoryModel.list(), ProductModel.featured('hot', 4), ProductModel.featured('moi', 8)
  ]);
  res.render('shop/home', { title: 'Trang chủ', categories, hot, newest });
};

exports.list = async (req, res) => {
  const f = parseFilters(req.query);
  const pg = pageInfo(req);
  const [data, categories, colors, sizes] = await Promise.all([
    ProductModel.searchShop(f, pg), CategoryModel.list(), VariantModel.colors(), VariantModel.sizes()
  ]);
  res.render('shop/products', {
    title: 'Cửa hàng', items: data.items, meta: pageMeta(data.total, pg.page, pg.size),
    f, categories, colors, sizes
  });
};

exports.detail = async (req, res) => {
  const id = toInt(req.params.id);
  const product = id ? await ProductModel.findById(id, { onlyActive: true }) : null;
  if (!product) return res.status(404).render('error', { title: 'Không tìm thấy', code: 404, message: 'Sản phẩm không tồn tại hoặc đã ngừng bán.' });
  await ProductModel.incView(id);
  const [variants, related, reviews] = await Promise.all([
    VariantModel.byProduct(id), ProductModel.related(id, product.MaDM), ProductModel.reviews(id)
  ]);
  const colors = []; const seen = new Set();
  variants.forEach((v) => { if (!seen.has(v.MaMau)) { seen.add(v.MaMau); colors.push({ MaMau: v.MaMau, TenMau: v.TenMau, MaHex: v.MaHex }); } });
  const sizes = []; const seenS = new Set();
  variants.forEach((v) => { if (!seenS.has(v.MaSize)) { seenS.add(v.MaSize); sizes.push({ MaSize: v.MaSize, TenSize: v.TenSize }); } });
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.SoSao, 0) / reviews.length : 0;
  res.render('shop/product-detail', {
    title: product.TenSP, p: product, variants, colors, sizes, related, reviews, avg,
    variantsJson: JSON.stringify(variants.map((v) => ({ mau: v.MaMau, size: v.MaSize, ton: v.SoLuongTon }))).replace(/</g, '\\u003c')
  });
};
