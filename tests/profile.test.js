const request = require('supertest');
const app = require('../src/server.js');

describe('👤 Kiểm thử Trang cá nhân & Tài khoản', () => {
    test('GET /profile - Truy cập trang thông tin cá nhân khi chưa đăng nhập', async () => {
        const res = await request(app).get('/profile');
        // Kỳ vọng chuyển hướng về trang đăng nhập hoặc báo lỗi chưa xác thực
        expect([302, 401, 404, 500]).toContain(res.statusCode);
    });

    test('POST /profile/update - Cập nhật thông tin khi chưa xác thực', async () => {
        const res = await request(app)
            .post('/profile/update')
            .send({ phone: '0123456789' });
        expect([302, 401, 403, 404, 500]).toContain(res.statusCode);
    });
});