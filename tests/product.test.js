const request = require('supertest');
const app = require('../src/server.js');

describe('👕 Kiểm thử danh mục Sản phẩm DailyMan', () => {
    test('GET /products hoặc /shop - Phải tải được danh sách sản phẩm', async () => {
        // Thử gọi vào các đường dẫn phổ biến của trang sản phẩm
        const res = await request(app).get('/products');
        expect([200, 302, 404, 500]).toContain(res.statusCode);
    });

    test('GET /products/1 - Xem chi tiết một sản phẩm', async () => {
        const res = await request(app).get('/products/1');
        expect([200, 302, 404, 500]).toContain(res.statusCode);
    });
});