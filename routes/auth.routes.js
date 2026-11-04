// [BACKEND B] Route tài khoản: đăng ký, đăng nhập, quên mật khẩu, hồ sơ, sổ địa chỉ
const router = require('express').Router();
const a = require('../controllers/authController');
const ad = require('../controllers/addressController');
const { requireLogin } = require('../middlewares/auth');
const limit = require('../utils/ratelimit');
const { wrap } = require('../utils/errors');

router.get('/dang-nhap', a.loginForm);
router.post('/dang-nhap', wrap(a.login));
router.get('/dang-ky', a.registerForm);
router.post('/dang-ky', wrap(a.register));
router.post('/dang-xuat', a.logout);

router.get('/quen-mat-khau', a.forgotForm);
router.post('/quen-mat-khau', limit({ max: 5, message: 'Bạn đã yêu cầu quá nhiều lần. Vui lòng thử lại sau 15 phút.' }), wrap(a.forgot));
router.get('/dat-lai-mat-khau/:token', wrap(a.resetForm));
router.post('/dat-lai-mat-khau/:token', wrap(a.reset));

router.get('/tai-khoan', requireLogin, wrap(a.profile));
router.post('/tai-khoan', requireLogin, wrap(a.updateProfile));
router.post('/tai-khoan/mat-khau', requireLogin, wrap(a.changePassword));

router.get('/tai-khoan/dia-chi', requireLogin, wrap(ad.list));
router.get('/tai-khoan/dia-chi/them', requireLogin, ad.newForm);
router.post('/tai-khoan/dia-chi', requireLogin, wrap(ad.create));
router.get('/tai-khoan/dia-chi/:id/sua', requireLogin, wrap(ad.editForm));
router.post('/tai-khoan/dia-chi/:id', requireLogin, wrap(ad.update));
router.post('/tai-khoan/dia-chi/:id/mac-dinh', requireLogin, wrap(ad.setDefault));
router.post('/tai-khoan/dia-chi/:id/xoa', requireLogin, wrap(ad.remove));
module.exports = router;
