// [BACKEND B] Route quản trị đơn hàng / dashboard / tài khoản
const router = require('express').Router();
const c = require('../controllers/adminOrderController');
const { requireStaff, requireAdmin } = require('../middlewares/auth');
const { wrap } = require('../utils/errors');

router.use(requireStaff);
router.get('/', wrap(c.dashboard));                              // Admin: dashboard; Staff: chuyển sang đơn hàng
router.get('/don-hang', wrap(c.orders));
router.get('/don-hang/:id', wrap(c.orderDetail));
router.post('/don-hang/:id/trang-thai', wrap(c.advance));
router.post('/don-hang/:id/huy', wrap(c.cancel));
router.get('/tai-khoan', wrap(c.users));                         // Staff chỉ xem
router.post('/tai-khoan/:id/vai-tro', requireAdmin, wrap(c.setRole));
router.post('/tai-khoan/:id/khoa', requireAdmin, wrap(c.setStatus));
module.exports = router;
