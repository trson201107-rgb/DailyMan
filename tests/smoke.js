// Smoke test KHÔNG cần SQL Server: thay lớp db bằng dữ liệu giả để kiểm tra mọi route + view chạy được, và lưu lại các câu SQL.
// Chạy: npm test
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const sqlLog = [];
const row = {
  MaSP: 1, TenSP: 'Áo thun test', MoTa: 'Mô tả', GiaBan: 199000, AnhDaiDien: null, TrangThai: 'Đang bán', NgayTao: new Date(), NgayCapNhat: new Date(), LuotXem: 150,
  MaDM: 1, TenDM: 'Áo thun', TongTon: 5, SoBienThe: 2, LaHot: 1, LaMoi: 1, TenNguoiTao: 'Admin', TenNguoiCapNhat: 'Admin', SoLuongTon: 5, Ton: 5, SKU: 'SKU-1',
  MaMau: 1, TenMau: 'Trắng', MaHex: '#FFFFFF', MaSize: 1, TenSize: 'M', MaBT: 1, Qty: 2, SoLuong: 2, DonGia: 199000, SoSao: 5, NoiDung: 'Tốt', NgayDG: new Date(), HoTen: 'Nguyễn A',
  n: 1, Tong: 4, DangBan: 3, SapHet: 1, HetHang: 0, hetHang: 0, sapHet: 1, MaDH: 1, NgayDat: new Date(), MaTrangThai: 2, TenTrangThai: 'Đã xác nhận', TenNguoiNhan: 'A', SDTNguoiNhan: '0901000001',
  DiaChiGiao: 'Số 1 Hà Nội', GhiChu: 'ghi chú', PhiVanChuyen: 30000, TienGiam: 0, TongThanhToan: 229000, TienHang: 199000, TenPT: 'COD', TrangThaiTT: 'Chưa thanh toán', MaPT: 1, MaCode: null,
  Email: 'a@x.vn', SoDienThoai: '0901000001', ThoiGian: new Date(), NguoiDoi: 'NV', SoSanPham: 2, DaBan: 3, Ngay: new Date(), DoanhThu: 500000, MaVoucher: 1, LoaiGiam: 'TIEN', GiaTriGiam: 30000,
  DonToiThieu: 0, NgayHetHan: new Date(), SoSanPham2: 1, MaTK: 9, TenVaiTro: 'Admin', TenHang: 'Đồng', DangKhoa: 0, PhutConKhoa: 0, SoLuotConLai: 5, ConHan: 1, DaSuDung: 0,
  doanhThuThang: 1, donThang: 1, khachMoi: 1, choXuLy: 1, PhanTramUuDai: 5, MoTaDM: '', SoSanPhamDM: 1
};
let loginRole = 'Admin';
const stub = {
  sql: {},
  query: async (text, p) => {
    sqlLog.push(text);
    if (/FROM TAI_KHOAN tk JOIN VAI_TRO/.test(text) && p && p.email) return [{ ...row, TenVaiTro: loginRole, MatKhauHash: bcrypt.hashSync('123456', 4), TrangThai: 'Hoạt động', MaTK: 9, SoDienThoai: '0901000009' }];
    if (/FROM TAI_KHOAN tk JOIN VAI_TRO/.test(text) && p && p.id) return [{ ...row, TenVaiTro: loginRole, MatKhauHash: bcrypt.hashSync('123456', 4), TrangThai: 'Hoạt động', MaTK: 9 }];
    return [{ ...row }];
  },
  run: async (text) => { sqlLog.push(text); return { recordset: [{ ...row }], rowsAffected: [1] }; },
  transaction: async (work) => work({ query: async (t) => { sqlLog.push(t); return [{ ...row }]; }, run: async (t) => { sqlLog.push(t); return { recordset: [{ ...row }], rowsAffected: [1] }; } })
};
const dbPath = require.resolve('../src/config/db.js');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: stub };
process.env.NODE_ENV = 'test';
const app = require('../src/app');

async function main() {
  const server = app.listen(0); const base = 'http://127.0.0.1:' + server.address().port;
  let cookie = ''; let fails = 0;
  const req = async (method, url, body, expect) => {
    const r = await fetch(base + url, { method, redirect: 'manual', headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' }, body: body ? new URLSearchParams(body).toString() : undefined });
    const sc = r.headers.getSetCookie ? r.headers.getSetCookie() : [];
    if (sc.length) cookie = sc.map((c) => c.split(';')[0]).join('; ');
    const ok = expect.includes(r.status);
    if (!ok) { fails++; console.log('FAIL', method, url, '->', r.status, 'expected', expect, ok ? '' : (await r.text()).slice(0, 300)); }
    else console.log('ok  ', method, url, r.status);
    return r;
  };
  const GET = (u, e = [200]) => req('GET', u, null, e); const POST = (u, b, e = [302]) => req('POST', u, b || {}, e);

  console.log('--- Khách (Guest)');
  await GET('/'); await GET('/healthz'); await GET('/san-pham'); await GET('/san-pham?dm=1&q=ao&giaMin=100000&giaMax=500000&mau=1&size=1&conHang=1&tag=hot&sort=gia-tang&page=2');
  await GET('/san-pham/1'); await GET('/gio-hang'); await GET('/dang-nhap'); await GET('/dang-ky'); await GET('/khong-co', [404]);
  await GET('/admin', [302]); await GET('/thanh-toan', [302]); await POST('/gio-hang/them', { maSP: 1, maMau: 1, maSize: 1, soLuong: 1 });
  await GET('/gio-hang'); await POST('/gio-hang/cap-nhat', { maBT: 1, soLuong: 2 }); await POST('/gio-hang/xoa', { maBT: 1 });
  console.log('--- Customer');
  loginRole = 'Customer';
  await POST('/dang-nhap', { email: 'a@x.vn', matKhau: 'sai' }, [400]);
  await POST('/dang-nhap', { email: 'a@x.vn', matKhau: '123456' });
  for (const u of ['/', '/tai-khoan', '/gio-hang', '/don-hang', '/don-hang?tt=1&q=1', '/don-hang/1', '/don-hang/1?moi=1']) await GET(u);
  const co = await GET('/thanh-toan'); const html = await co.text(); const token = (html.match(/name="token" value="([a-f0-9]+)"/) || [])[1];
  if (!token) { fails++; console.log('FAIL: không có token checkout'); }
  await POST('/dat-hang', { token, ten: 'An', sdt: '0901000001', diaChi: '12 Trần Hưng Đạo, Hà Nội', maPT: 1 }, [302]);
  await POST('/dat-hang', { token, ten: 'An', sdt: '0901000001', diaChi: '12 Trần Hưng Đạo, Hà Nội', maPT: 1 }, [302]);   // bấm lần 2 => không tạo đơn mới
  await POST('/dat-hang', { token: 'sai', ten: 'An' }, [302]);
  await POST('/don-hang/1/huy'); await POST('/gio-hang/ma-giam-gia', { code: 'DAILY10' }); await POST('/gio-hang/bo-ma');
  await POST('/tai-khoan', { hoTen: 'An', sdt: '0901000001' }); await POST('/tai-khoan/mat-khau', { matKhauCu: '123456', matKhauMoi: 'abcdef', matKhauMoi2: 'abcdef' });
  await GET('/admin/san-pham', [403]); await GET('/admin', [403]);
  await POST('/dang-xuat');
  console.log('--- Đăng ký');
  await POST('/dang-ky', { hoTen: 'Mới', email: 'moi@x.vn', sdt: '0912345678', matKhau: '123456', matKhau2: '123456' }, [302]);
  await POST('/dang-ky', { hoTen: 'M', email: 'sai', sdt: '1', matKhau: '1', matKhau2: '2' }, [400]);
  await POST('/dang-xuat');
  console.log('--- Admin');
  loginRole = 'Admin';
  await POST('/dang-nhap', { email: 'ad@x.vn', matKhau: '123456' });
  for (const u of ['/admin', '/admin/san-pham', '/admin/san-pham?q=a&dm=1&trangThai=sap-het&sort=ton-tang&page=1', '/admin/san-pham/them', '/admin/san-pham/1', '/admin/san-pham/1/sua',
    '/admin/danh-muc', '/admin/danh-muc?sua=1', '/admin/don-hang', '/admin/don-hang?tt=1&q=abc&tu=2026-01-01&den=2026-12-31', '/admin/don-hang/1', '/admin/tai-khoan', '/admin/tai-khoan?q=a&role=Staff']) await GET(u);
  const body = { ten: 'Áo mới', gia: '199000', maDM: 1, anh: '', moTa: 'x', trangThai: 'Đang bán', 'bienthe[0][mau]': 1, 'bienthe[0][size]': 1, 'bienthe[0][sku]': '', 'bienthe[0][ton]': 5 };
  await POST('/admin/san-pham', body, [302]);
  await POST('/admin/san-pham', { ...body, gia: '-5' }, [400]);
  await POST('/admin/san-pham', { ...body, 'bienthe[0][mau]': '' }, [400]);
  await POST('/admin/san-pham/1', body, [302]); await POST('/admin/san-pham/1/an'); await POST('/admin/san-pham/1/hien'); await POST('/admin/san-pham/1/xoa');
  await POST('/admin/san-pham/1/bien-the', { mau: 1, size: 1, ton: 3, sku: 'abc' }); await POST('/admin/bien-the/1/ton-kho', { ton: 7 }); await POST('/admin/bien-the/1/ton-kho', { ton: -1 }); await POST('/admin/bien-the/1/xoa');
  await POST('/admin/danh-muc', { ten: 'Mới', moTa: '' }); await POST('/admin/danh-muc/1', { ten: 'Sửa' }); await POST('/admin/danh-muc/1/xoa');
  await POST('/admin/don-hang/1/trang-thai'); await POST('/admin/don-hang/1/huy', { lyDo: 'Hết hàng' }); await POST('/admin/don-hang/1/huy', {});
  await POST('/admin/tai-khoan/2/vai-tro', { role: 'Staff' }); await POST('/admin/tai-khoan/2/khoa', { trangThai: 'Bị khóa' });
  console.log('--- Staff');
  await POST('/dang-xuat'); loginRole = 'Staff';
  await POST('/dang-nhap', { email: 'st@x.vn', matKhau: '123456' });
  await GET('/admin', [302]); await GET('/admin/don-hang'); await GET('/admin/san-pham'); await GET('/admin/san-pham/1'); await GET('/admin/tai-khoan');
  await GET('/admin/san-pham/them', [403]); await POST('/admin/san-pham/1/an', {}, [403]); await POST('/admin/bien-the/1/ton-kho', { ton: 4 }); await GET('/admin/danh-muc', [403]);
  await POST('/admin/tai-khoan/2/khoa', { trangThai: 'Bị khóa' }, [403]);

  fs.writeFileSync(path.join(__dirname, '.captured.sql'), [...new Set(sqlLog)].join('\n-- ####\n'));
  server.close();
  console.log(fails ? `\n${fails} LỖI` : '\nTẤT CẢ ROUTE/VIEW CHẠY ĐƯỢC');
  process.exit(fails ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
