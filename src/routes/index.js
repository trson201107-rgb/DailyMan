// Gắn toàn bộ route (file dùng chung)
const router = require('express').Router();
router.use('/', require('./shop.routes'));
router.use('/', require('./auth.routes'));
router.use('/', require('./cart.routes'));
router.use('/admin', require('./admin.product.routes'));
router.use('/admin', require('./admin.order.routes'));
module.exports = router;
