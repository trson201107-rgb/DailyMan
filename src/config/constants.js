// Hằng số dùng chung toàn hệ thống (sửa ở đây, không rải số "cứng" trong code)
module.exports = {
  PAGE_SIZE: 8,            // số sản phẩm / trang phía khách (bảng Sprint 2: "1 trang hiển thị ??? SP")
  ADMIN_PAGE_SIZE: 10,     // số dòng / trang trong trang quản trị
  LOW_STOCK: 10,           // tổng tồn <= ngưỡng này (và > 0) => "Sắp hết hàng"
  NEW_DAYS: 30,            // sản phẩm tạo trong N ngày gần đây => "Mới"
  HOT_MIN_VIEWS: 100,      // lượt xem >= ngưỡng này => "Hot"
  SHIP_FEE: 30000,
  FREE_SHIP_FROM: 1000000, // đơn từ mức này miễn phí vận chuyển
  MAX_LOGIN_FAIL: 5,       // sai mật khẩu quá số lần => khóa tạm
  LOCK_MINUTES: 15,
  STATUS: { CHO: 1, XAC_NHAN: 2, DONG_GOI: 3, DANG_GIAO: 4, HOAN_THANH: 5, HUY: 6 }, // = MaTrangThai trong TRANG_THAI_DON
  SP: { BAN: 'Đang bán', AN: 'Ngừng bán' },
  ROLE: { CUSTOMER: 'Customer', STAFF: 'Staff', ADMIN: 'Admin' }
};
