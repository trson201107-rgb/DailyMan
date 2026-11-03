# Sprint 3 – Hoàn thiện chức năng

Mục tiêu: bổ sung toàn bộ chức năng còn thiếu theo báo cáo Sprint 1 và bộ test case `TestCase_DailyMan.xlsx`, để có web hoàn chỉnh.

## 1. Phân công và file thay đổi

**Thái (BE1 – Sản phẩm)**
```
src/models/ImageModel.js (mới)  ReviewModel.js (mới)  ProductModel.js  VariantModel.js
src/controllers/shopController.js  adminProductController.js
src/routes/shop.routes.js  admin.product.routes.js
src/middlewares/upload.js (mới)
```
Việc: giá gốc + % giảm, nhiều ảnh (tải lên, URL, ảnh chính, xóa), khoảng giá nhanh (< 500k...), đánh giá sản phẩm, nhập hàng/kiểm kê/điều chỉnh + lịch sử tồn kho, xuất CSV sản phẩm.

**Sơn (BE2 – Tài khoản, giỏ hàng, đơn hàng, quản trị) + nhóm trưởng**
```
src/models/ResetModel.js  AddressModel.js  ReturnModel.js  TierModel.js (mới)  UserModel.js  CartModel.js  OrderModel.js  VoucherModel.js  StatsModel.js
src/controllers/addressController.js  adminUserController.js  adminReturnController.js  adminVoucherController.js  adminTierController.js (mới)
src/controllers/authController.js  cartController.js  orderController.js  adminOrderController.js
src/routes/auth.routes.js  cart.routes.js  admin.order.routes.js
src/utils/mailer.js  ratelimit.js  validators.js  provinces.js (mới)
```
Việc: quên/đặt lại mật khẩu, đăng nhập SĐT + ghi nhớ, sổ địa chỉ, chọn dòng thanh toán, báo giá đổi, ưu đãi hạng, đổi trả (khách + nhân viên), cập nhật hàng loạt, Dashboard theo kỳ, voucher + phát voucher, hạng thành viên, tạo tài khoản, xuất CSV đơn hàng.

**Trung (FE – Giao diện)**
```
src/views/**  src/public/css/style.css  src/public/js/main.js
```
Việc: thanh tiến trình, thư viện ảnh + phóng to, chip bộ lọc, khoảng giá nhanh, thẻ địa chỉ, tiến trình đơn 5 bước, khung đổi trả, form quên mật khẩu, hiện/ẩn mật khẩu, thanh điều hướng dưới cùng trên điện thoại (5 tab khách / 4 tab quản trị), các trang quản trị mới.

**Dùng chung (trưởng nhóm cập nhật):** `package.json`, `.env.example`, `render.yaml`, `README.md`, `database/*`, `docs/*`, `tests/*`, `src/app.js`, `src/config/constants.js`, `src/utils/helpers.js`, `src/middlewares/common.js`, `security.js`.

## 2. Nâng cấp cơ sở dữ liệu
Chạy `database/sprint3_upgrade.sql` trên database đang dùng. Script thêm:
- Cột: `SAN_PHAM.GiaGoc`, `DON_HANG.UuDaiHang`, `CHI_TIET_GIO_HANG.GiaLucThem`.
- Bảng: `ANH_SAN_PHAM`, `DIA_CHI`, `DAT_LAI_MAT_KHAU`, `YEU_CAU_DOI_TRA`, `LS_TON_KHO`, `CAU_HINH`.
- Dữ liệu: trạng thái đơn `Đổi trả` (mã 7), cấu hình `UU_DAI_HANG` = 0.

Muốn dữ liệu mẫu đầy đủ (địa chỉ, yêu cầu đổi trả, giá gốc...), chạy lại `dailyman_local.sql` (xóa và tạo lại database).

## 3. Đối chiếu với bộ test case

**Test case trước đây báo "chưa có chức năng" – nay đã có:**

| Test case | Chức năng |
|---|---|
| TC-XT-17 | Đăng nhập bằng số điện thoại |
| TC-XT-21 | Nút hiện/ẩn mật khẩu |
| TC-XT-22 | Ghi nhớ đăng nhập (cookie 30 ngày; không tích thì hết khi đóng trình duyệt) |
| TC-XT-27 đến 31 | Quên mật khẩu: gửi liên kết (hiệu lực 30 phút, dùng một lần), thông báo chung khi email không tồn tại, đặt lại, liên kết hết hạn, mật khẩu mới không hợp lệ |
| TC-TK-14 | Chip ✕ bỏ từng tiêu chí lọc |
| TC-TK-09, 13 | Khoảng giá nhanh "Dưới 500.000đ" là nhỏ hơn 500.000 (không tính đúng 500.000) |
| TC-CT-01, 10 | Giá gốc gạch ngang và % giảm |
| TC-CT-14 | Nhiều ảnh, đổi ảnh, phóng to |
| TC-DH-08, 10 | Địa chỉ gồm tỉnh, quận, chi tiết; thẻ địa chỉ có nút Sửa |
| TC-DH-13 | Báo giá thay đổi, không tạo đơn với giá cũ |
| TC-DH-20 | Chỉ đặt các dòng đã chọn, dòng còn lại giữ nguyên trong giỏ |
| TC-DH-22 | Thanh tiến trình các bước |
| TC-TD-04 | Tiến trình đơn 5 bước |
| TC-TD-13 đến 15 | Yêu cầu đổi trả (đơn Hoàn thành, bắt buộc lý do, đơn chưa hoàn thành bị từ chối) |
| TC-QD-18, 19 | Cập nhật nhanh nhiều đơn; đơn sai thứ tự bị từ chối kèm lý do |
| TC-QD-21, 22 | Chấp nhận / từ chối đổi trả (từ chối bắt buộc lý do) |
| TC-SP-28 | Xuất danh sách sản phẩm CSV theo bộ lọc |
| TC-DB-07, 08 | Dashboard chọn khoảng thời gian; kỳ không có đơn hiển thị 0 và thông báo |
| TC-BM-14 | Thanh điều hướng dưới cùng trên điện thoại |

**Vẫn cần chỉnh test hoặc dữ liệu (không phải thiếu chức năng):** TC-XT-09 và TC-BM-06 (tên bảng `TAI_KHOAN.MatKhauHash`), TC-TK-10 và 12 (màu "Xanh đậm" chưa có trong dữ liệu mẫu), TC-QD-10 và 11 (hệ thống không cho nhảy cóc hay quay lui nên không thể thử), TC-SP-16 (phải Ẩn trước khi Xóa vĩnh viễn), TC-BM-10 (phiên), và nhóm cần công cụ ngoài (TC-TK-21, BM-09, BM-12, BM-13, DH-16).

## 4. Lưu ý khi chạy test
- **Ưu đãi hạng thành viên mặc định TẮT** để tổng tiền trong các test đặt hàng và mã giảm giá không bị lệch. Muốn thử: Admin → Hạng thành viên → Bật ưu đãi.
- **Đổi trả:** chỉ trong 7 ngày kể từ lúc đơn Hoàn thành. Đơn mẫu số 3 (An) và số 11 (Khánh) có sẵn yêu cầu đổi trả để xem.
- **Báo giá đổi:** chỉ áp dụng với dòng giỏ thêm sau khi nâng cấp (dòng cũ chưa lưu giá lúc thêm nên không báo).
- **Email quên mật khẩu:** cần cấu hình SMTP, hoặc dùng `RESET_SHOW_LINK=true` khi demo.
- **Mật khẩu mới ở TC-XT-29 (`Moi@12345`)** hợp lệ vì quy tắc hiện tại là tối thiểu 6 ký tự.

## 5. Giới hạn đã biết
- `npm test` dùng cơ sở dữ liệu giả, không chạy trên SQL Server thật: nhóm cần chạy hệ thống thật để xác nhận.
- Chưa có: đặt hàng không cần tài khoản, cổng thanh toán và vận chuyển thật, đăng nhập mạng xã hội, danh sách yêu thích.
- Thông tin QR chuyển khoản là minh họa.
