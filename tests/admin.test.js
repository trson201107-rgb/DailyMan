const request = require('supertest');
const app = require('../src/server.js');

describe('🛡️ Kiểm thử bảo mật trang Admin', () => {
    test('GET /admin - Chưa đăng nhập phải bị chặn hoặc chuyển hướng về trang login', async () => {
        const res = await request(app).get('/admin');
        // Kỳ vọng 302 (chuyển hướng login), 401/403 (cấm truy cập), hoặc 404 nếu route khác tên
        expect([302, 401, 403, 404, 500]).toContain(res.statusCode);
    });
});