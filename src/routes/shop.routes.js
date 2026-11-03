// [BACKEND A] Route phía khách
const router = require('express').Router();
const shop = require('../controllers/shopController');
const { wrap } = require('../utils/errors');

router.get('/', wrap(shop.home));
router.get('/san-pham', wrap(shop.list));
router.get('/san-pham/:id', wrap(shop.detail));
module.exports = router;
