// [BACKEND B] Route tài khoản
const router = require('express').Router();
const a = require('../controllers/authController');
const { requireLogin } = require('../middlewares/auth');
const { wrap } = require('../utils/errors');

router.get('/dang-nhap', a.loginForm);
router.post('/dang-nhap', wrap(a.login));
router.get('/dang-ky', a.registerForm);
router.post('/dang-ky', wrap(a.register));
router.post('/dang-xuat', a.logout);
router.get('/tai-khoan', requireLogin, wrap(a.profile));
router.post('/tai-khoan', requireLogin, wrap(a.updateProfile));
router.post('/tai-khoan/mat-khau', requireLogin, wrap(a.changePassword));
module.exports = router;
