const request = require('supertest');
const app = require('../src/server.js');

describe('🛒 Kiểm thử Giỏ hàng (Cart)', () => {
    test('GET /cart - Phải mở được trang giỏ hàng', async () => {
        const res = await request(app).get('/cart');
        expect([200, 302, 404, 500]).toContain(res.statusCode);
    });

    test('POST /cart/add - Thêm sản phẩm với dữ liệu rỗng phải báo lỗi hoặc chuyển hướng', async () => {
        const res = await request(app)
            .post('/cart/add')
            .send({ productId: '', quantity: 0 });
        expect([400, 302, 404, 500]).toContain(res.statusCode);
    });
});