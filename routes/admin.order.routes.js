// [BACKEND B] Route quản trị: dashboard, đơn hàng, đổi trả, voucher, hạng thành viên, tài khoản
const router = require('express').Router();
const c = require('../controllers/adminOrderController');
const u = require('../controllers/adminUserController');
const r = require('../controllers/adminReturnController');
const v = require('../controllers/adminVoucherController');
const t = require('../controllers/adminTierController');
const { requireStaff, requireAdmin } = require('../middlewares/auth');
const { wrap } = require('../utils/errors');

router.use(requireStaff);
router.get('/', wrap(c.dashboard));                              // Admin: dashboard; Staff: chuyển sang đơn hàng

router.get('/don-hang', wrap(c.orders));
router.get('/don-hang/xuat', wrap(c.exportOrders));              // phải đặt trước /don-hang/:id
router.post('/don-hang/hang-loat', wrap(c.bulk));
router.get('/don-hang/:id', wrap(c.orderDetail));
router.post('/don-hang/:id/trang-thai', wrap(c.advance));
router.post('/don-hang/:id/huy', wrap(c.cancel));

router.get('/doi-tra', wrap(r.list));
router.post('/doi-tra/:id/chap-nhan', wrap(r.accept));
router.post('/doi-tra/:id/tu-choi', wrap(r.reject));

router.get('/voucher', requireAdmin, wrap(v.list));
router.get('/voucher/them', requireAdmin, v.newForm);
router.post('/voucher', requireAdmin, wrap(v.create));
router.get('/voucher/:id/sua', requireAdmin, wrap(v.editForm));
router.post('/voucher/:id', requireAdmin, wrap(v.update));
router.post('/voucher/:id/ket-thuc', requireAdmin, wrap(v.expire));
router.post('/voucher/:id/xoa', requireAdmin, wrap(v.remove));
router.post('/voucher/:id/phat', requireAdmin, wrap(v.distribute));

router.get('/hang-thanh-vien', requireAdmin, wrap(t.view));
router.post('/hang-thanh-vien', requireAdmin, wrap(t.save));
router.post('/hang-thanh-vien/bat-tat', requireAdmin, wrap(t.toggle));
router.post('/hang-thanh-vien/tinh-lai', requireAdmin, wrap(t.recompute));

router.get('/tai-khoan', wrap(u.users));                         // Staff chỉ xem
router.get('/tai-khoan/them', requireAdmin, u.newForm);
router.post('/tai-khoan', requireAdmin, wrap(u.create));
router.get('/tai-khoan/:id', wrap(u.detail));
router.post('/tai-khoan/:id/vai-tro', requireAdmin, wrap(u.setRole));
router.post('/tai-khoan/:id/khoa', requireAdmin, wrap(u.setStatus));
module.exports = router;
