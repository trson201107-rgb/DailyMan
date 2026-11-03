// [BACKEND B] Route giỏ hàng, thanh toán, đơn hàng của khách
const router = require('express').Router();
const cart = require('../controllers/cartController');
const order = require('../controllers/orderController');
const { requireLogin } = require('../middlewares/auth');
const { wrap } = require('../utils/errors');

router.get('/gio-hang', wrap(cart.view));
router.post('/gio-hang/them', wrap(cart.add));
router.post('/gio-hang/cap-nhat', wrap(cart.update));
router.post('/gio-hang/xoa', wrap(cart.remove));
router.post('/gio-hang/chon', cart.choose);
router.post('/gio-hang/chap-nhan-gia', wrap(cart.acceptPrices));
router.post('/gio-hang/ma-giam-gia', wrap(cart.applyVoucher));
router.post('/gio-hang/bo-ma', cart.removeVoucher);

router.get('/thanh-toan', requireLogin, wrap(order.checkoutForm));
router.post('/dat-hang', requireLogin, wrap(order.place));
router.get('/don-hang', requireLogin, wrap(order.list));
router.get('/don-hang/:id', requireLogin, wrap(order.detail));
router.post('/don-hang/:id/huy', requireLogin, wrap(order.cancel));
router.post('/don-hang/:id/doi-tra', requireLogin, wrap(order.requestReturn));
module.exports = router;
