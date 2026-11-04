// [BACKEND A] Route phía khách
const router = require('express').Router();
const shop = require('../controllers/shopController');
const { requireLogin } = require('../middlewares/auth');
const { wrap } = require('../utils/errors');

router.get('/', wrap(shop.home));
router.get('/san-pham', wrap(shop.list));
router.get('/san-pham/:id', wrap(shop.detail));
router.post('/san-pham/:id/danh-gia', requireLogin, wrap(shop.review));
router.get('/anh/:id', wrap(shop.image));
module.exports = router;
