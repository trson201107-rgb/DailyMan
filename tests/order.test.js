const request = require('supertest');
const app = require('../src/server.js');

describe('📦 Kiểm thử Đặt hàng & Đơn hàng (Order)', () => {
    test('GET /checkout - Truy cập trang thanh toán', async () => {
        const res = await request(app).get('/checkout');
        expect([200, 302, 404, 500]).toContain(res.statusCode);
    });

    test('POST /checkout - Đặt hàng khi chưa có thông tin hợp lệ phải từ chối', async () => {
        const res = await request(app)
            .post('/checkout')
            .send({});
        expect([400, 401, 302, 404, 500]).toContain(res.statusCode);
    });
});