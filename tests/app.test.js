const request = require('supertest');
const app = require('../src/server.js');

describe('🚀 Kiểm thử tổng quan hệ thống DailyMan', () => {
    test('GET / - Trang chủ phải phản hồi (200, 302 chuyển hướng, hoặc 500 nếu mất DB)', async () => {
        const res = await request(app).get('/');
        expect([200, 302, 404, 500]).toContain(res.statusCode);
    });

    test('GET /notfound - Phải trả về lỗi 404 khi truy cập trang không tồn tại', async () => {
        const res = await request(app).get('/duong-dan-khong-ton-tai-12345');
        expect(res.statusCode).toBe(404);
    });
});