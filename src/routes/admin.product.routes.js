// [BACKEND A] Route quản trị sản phẩm / danh mục (Staff xem + chỉnh tồn kho; Admin được thêm/sửa/ẩn/xóa)
const router = require('express').Router();
const p = require('../controllers/adminProductController');
const c = require('../controllers/adminCategoryController');
const { requireStaff, requireAdmin } = require('../middlewares/auth');
const { wrap } = require('../utils/errors');

router.use(requireStaff);
router.get('/san-pham', wrap(p.list));
router.get('/san-pham/them', requireAdmin, wrap(p.newForm));
router.post('/san-pham', requireAdmin, wrap(p.create));
router.get('/san-pham/:id', wrap(p.detail));
router.get('/san-pham/:id/sua', requireAdmin, wrap(p.editForm));
router.post('/san-pham/:id', requireAdmin, wrap(p.update));
router.post('/san-pham/:id/an', requireAdmin, wrap(p.hide));
router.post('/san-pham/:id/hien', requireAdmin, wrap(p.show));
router.post('/san-pham/:id/xoa', requireAdmin, wrap(p.remove));
router.post('/san-pham/:id/bien-the', requireAdmin, wrap(p.addVariant));
router.post('/bien-the/:id/ton-kho', wrap(p.setStock));          // Staff + Admin
router.post('/bien-the/:id/xoa', requireAdmin, wrap(p.removeVariant));

router.get('/danh-muc', requireAdmin, wrap(c.list));
router.post('/danh-muc', requireAdmin, wrap(c.create));
router.post('/danh-muc/:id', requireAdmin, wrap(c.update));
router.post('/danh-muc/:id/xoa', requireAdmin, wrap(c.remove));
module.exports = router;
