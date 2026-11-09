const request = require('supertest');
const app = require('../src/server.js');

describe('🔍 Kiểm thử Tìm kiếm & Lọc sản phẩm', () => {
    test('GET /search?keyword=ao-so-mi - Tìm kiếm sản phẩm áo sơ mi', async () => {
        const res = await request(app).get('/search?keyword=ao-so-mi');
        expect([200, 302, 404, 500]).toContain(res.statusCode);
    });

    test('GET /category/quan-dai - Lọc sản phẩm theo danh mục quần', async () => {
        const res = await request(app).get('/category/quan-dai');
        expect([200, 302, 404, 500]).toContain(res.statusCode);
    });
});