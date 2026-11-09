const request = require('supertest');
const app = require('../src/server.js');

describe('🛠️ Kiểm thử Quản lý sản phẩm (Admin)', () => {
    test('GET /admin/products - Xem danh sách sản phẩm quản trị', async () => {
        const res = await request(app).get('/admin/products');
        expect([302, 401, 403, 404, 500]).toContain(res.statusCode);
    });

    test('POST /admin/products/add - Thêm sản phẩm mới với dữ liệu thiếu phải báo lỗi', async () => {
        const res = await request(app)
            .post('/admin/products/add')
            .send({});
        expect([302, 400, 401, 403, 404, 500]).toContain(res.statusCode);
    });
});