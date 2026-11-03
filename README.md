# dailyman – Website quản lý thời trang nam thường nhật

Đồ án môn Công nghệ phần mềm. Công nghệ: **Node.js + Express + EJS + SQL Server**, tổ chức theo mô hình **MVC**.
Phiên bản hiện tại: **Sprint 3** (đầy đủ chức năng theo báo cáo Sprint 1).

## 1. Mô hình MVC trong project

| Thành phần | Thư mục | Vai trò |
|---|---|---|
| **Model** | `src/models/` | Toàn bộ truy vấn SQL (tham số hóa, chống SQL Injection), giao dịch đặt hàng / hủy đơn / đổi trả |
| **View** | `src/views/`, `src/public/` | Giao diện EJS, CSS, JS phía trình duyệt |
| **Controller** | `src/controllers/` | Nhận request, kiểm tra dữ liệu ở máy chủ, gọi Model, chọn View |
| Route | `src/routes/` | Nối URL → Controller (+ phân quyền) |

Luồng: `Request → security → routes → auth → controller → model → SQL Server`, rồi `controller → view → Response`.

## 2. Chức năng

**Khách (Guest) và Khách hàng (Customer)**
- Xem trang chủ, danh mục; **tìm kiếm, lọc** (danh mục, khoảng giá nhanh, màu, size, Mới, Hot, còn hàng) kèm **chip bỏ từng tiêu chí**; **sắp xếp**; **phân trang**.
- Chi tiết sản phẩm: **nhiều ảnh + phóng to**, **giá gốc gạch ngang và % giảm**, chọn màu/size, tồn kho theo biến thể, sản phẩm liên quan, **đánh giá** (chỉ khách đã nhận hàng).
- Giỏ hàng: khách vãng lai dùng giỏ tạm và được **gộp** khi đăng nhập; **chọn từng dòng để thanh toán**; **báo khi giá thay đổi**; mã giảm giá + ví voucher; ưu đãi hạng thành viên (bật/tắt ở Admin).
- Thanh toán: **thanh tiến trình các bước**, **sổ địa chỉ** (tỉnh/quận/chi tiết), COD hoặc QR; đặt hàng trong **một giao dịch**, chống bấm đúp.
- Đơn hàng: theo dõi **tiến trình 5 bước**, hủy đơn khi còn Chờ xác nhận, **yêu cầu đổi trả** (đơn Hoàn thành, trong 7 ngày, bắt buộc lý do).
- Tài khoản: đăng ký, đăng nhập bằng **email hoặc SĐT**, **hiện/ẩn mật khẩu**, **ghi nhớ đăng nhập**, **quên và đặt lại mật khẩu qua email**, hồ sơ, đổi mật khẩu, sổ địa chỉ.

**Nhân viên (Staff) và Quản trị (Admin)**
- **Dashboard** theo khoảng ngày tùy chọn (7 ngày, 30 ngày, tháng này, từ–đến), biểu đồ doanh thu theo ngày, bán chạy, cảnh báo tồn kho.
- **Đơn hàng**: tìm/lọc, đổi trạng thái đúng thứ tự, **cập nhật nhanh nhiều đơn**, hủy kèm lý do (hoàn tồn kho), **xuất CSV**.
- **Đổi trả**: chấp nhận hoặc từ chối (bắt buộc lý do), có nhật ký.
- **Sản phẩm** (Admin): thêm/sửa, **ẩn → xóa vĩnh viễn**, biến thể, **nhiều ảnh** (tải lên hoặc URL), **giá gốc**, tìm/lọc/sắp xếp/phân trang, **xuất CSV**; danh mục.
- **Tồn kho** (Staff + Admin): **nhập hàng, kiểm kê, điều chỉnh**, có **lịch sử tồn kho**.
- **Khuyến mãi** (Admin): quản lý voucher (tạo, sửa, kết thúc, xóa), **phát voucher vào ví** theo tất cả/hạng/một khách; **hạng thành viên** (ngưỡng, % ưu đãi, bật/tắt, tính lại).
- **Tài khoản**: Staff tra cứu khách (kèm lịch sử đơn); Admin tạo tài khoản, đổi vai trò, khóa/mở khóa.
- Nhật ký thao tác quan trọng ra `logs/app.log`.

Chưa làm (theo báo cáo là Could/Won't have): đặt hàng không cần tài khoản, cổng thanh toán và API vận chuyển thật, đăng nhập Google/Facebook, danh sách yêu thích.

## 3. Chạy trên máy (local)

1. Cài **Node.js ≥ 18** và **SQL Server** (Express/Developer) hoặc Docker:
   ```bash
   docker run -e ACCEPT_EULA=Y -e MSSQL_SA_PASSWORD='Passw0rd!123' -p 1433:1433 -d mcr.microsoft.com/mssql/server:2022-latest
   ```
2. **Tạo CSDL** (chọn một):
   - **Làm mới hoàn toàn:** mở `database/dailyman_local.sql` bằng SSMS / Azure Data Studio và chạy toàn bộ. Script xóa và tạo lại database `ThoiTrangNam` kèm dữ liệu mẫu.
   - **Đang có CSDL Sprint 2, muốn giữ dữ liệu:** chọn database `ThoiTrangNam` rồi chạy `database/sprint3_upgrade.sql` (chạy lại nhiều lần không lỗi).
3. ```bash
   npm install
   cp .env.example .env      # Windows: copy .env.example .env, rồi sửa DB_USER / DB_PASSWORD
   npm start                 # mở http://localhost:3000
   ```
4. Kiểm tra nhanh không cần DB: `npm test` (14 kiểm tra logic + 191 yêu cầu route/view chạy bằng DB giả). Lưu ý đây **không thay thế** việc chạy test case trên hệ thống thật.

### Tài khoản demo (mật khẩu chung: `123456`)
| Vai trò | Email |
|---|---|
| Admin | duc.pham@shop.vn |
| Staff | cuong.le@shop.vn |
| Customer | an.nguyen@gmail.com · binh.tran@gmail.com · ha.hoang@gmail.com · khanh.vu@gmail.com |

Mã giảm giá mẫu: `DAILY10`, `FREESHIP30`, `GIAM10`, `WELCOME50`.

### Email quên mật khẩu
Điền `SMTP_*` trong `.env` (ví dụ Gmail + Mật khẩu ứng dụng) để gửi email thật. Chưa có SMTP thì:
- Đang phát triển: liên kết đặt lại được in ra cửa sổ Terminal.
- Demo cho thầy: đặt `RESET_SHOW_LINK=true` để liên kết hiện ngay trên trang. **Không bật khi chạy thật.**

## 4. Deploy (miễn phí): Render (web) + Azure SQL Database (CSDL)

> Ứng dụng dùng SQL Server nên cần một SQL Server đặt trên mạng. Gói miễn phí và điều kiện thay đổi theo thời gian, hãy kiểm tra lại trên trang chính thức khi làm.

**Bước 1 – CSDL (Azure SQL, gói free):** tạo *SQL Database* với free offer, bật **Allow Azure services** ở *Networking* và thêm IP của bạn. Kết nối bằng SSMS/Azure Data Studio và chạy `database/dailyman_cloud.sql` (không có CREATE DATABASE/USE). Gói free tự "ngủ" khi rảnh nên lần truy cập đầu có thể chậm.

**Bước 2 – Đẩy code lên GitHub**, **Bước 3 – Render:** *New → Web Service* (hoặc *Blueprint* dùng `render.yaml`). Build: `npm install`, Start: `npm start`, Health check: `/healthz`. Biến môi trường:

| Biến | Giá trị |
|---|---|
| `NODE_ENV` | `production` |
| `SESSION_SECRET` | chuỗi ngẫu nhiên dài |
| `DB_SERVER` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | theo Azure SQL |
| `DB_ENCRYPT` / `DB_TRUST_CERT` | `true` / `false` |
| `DISPLAY_TZ` | `Asia/Ho_Chi_Minh` |
| `APP_URL` | địa chỉ web của bạn, ví dụ `https://dailyman.onrender.com` |
| `SMTP_*`, `MAIL_FROM` | (tùy chọn) để gửi email quên mật khẩu |

Gói free của Render tự ngủ sau khoảng 15 phút không có truy cập; hãy mở trang trước giờ demo.
Ảnh sản phẩm tải lên được lưu **trong CSDL** nên không mất khi Render khởi động lại.

## 5. Lỗi thường gặp
- `Login failed for user` → sai `DB_USER/DB_PASSWORD`. `Failed to connect ... ECONNREFUSED` → chưa bật TCP/IP hoặc sai `DB_SERVER`/`DB_PORT`.
- `self signed certificate` khi chạy local → `DB_TRUST_CERT=true`, `DB_ENCRYPT=false`.
- `Invalid object name 'DIA_CHI'` (hoặc ANH_SAN_PHAM, YEU_CAU_DOI_TRA…) → CSDL chưa nâng cấp Sprint 3: chạy `database/sprint3_upgrade.sql`.
- `Invalid column name 'GiaGoc'` → như trên.
- Giờ hiển thị lệch 7 tiếng → chỉnh `DISPLAY_TZ` (DB cloud lưu giờ UTC → `Asia/Ho_Chi_Minh`; DB đặt ở máy VN → `UTC`).
