# dailyman – Website quản lý thời trang nam thường nhật

Đồ án Sprint 2. Công nghệ: **Node.js + Express + EJS + SQL Server**, tổ chức theo mô hình **MVC**.

## 1. Mô hình MVC trong project

| Thành phần | Thư mục | Vai trò |
|---|---|---|
| **Model** | `src/models/` | Toàn bộ truy vấn SQL (tham số hóa, chống SQL Injection), giao dịch đặt hàng / hủy đơn |
| **View** | `src/views/`, `src/public/` | Giao diện EJS, CSS, JS phía trình duyệt |
| **Controller** | `src/controllers/` | Nhận request, kiểm tra dữ liệu ở máy chủ, gọi Model, chọn View |
| Route | `src/routes/` | Nối URL → Controller (+ phân quyền) |

Luồng: `Request → routes → middlewares(auth) → controller → model → SQL Server`, rồi `controller → view → Response`.

## 2. Chức năng đã làm

**Sprint 2 – Quản lý sản phẩm (theo bảng của thầy):** kết nối DB + CRUD; thêm sản phẩm (kèm biến thể màu/size/SKU/tồn); sửa; **Ẩn** (Status 1→0) rồi mới **Xóa vĩnh viễn** (chỉ khi chưa nằm trong đơn hàng); tìm kiếm (tên, danh mục, giá, Mới, Hot, SKU); lọc; sắp xếp (giá, tên, danh mục, mới, hot, tồn kho); **phân trang** (hằng số `PAGE_SIZE` / `ADMIN_PAGE_SIZE` trong `src/config/constants.js`); danh sách trống có thông báo; hiển thị chi tiết; ghi **create date / update date / create by / update by**; cảnh báo **sắp hết / hết hàng**; sản phẩm liên quan.

**Toàn hệ thống (theo báo cáo Sprint 1):** đăng ký / đăng nhập / đăng xuất (bcrypt, khóa tạm 15 phút khi sai mật khẩu 5 lần), phân quyền Guest / Customer / Staff / Admin; giỏ hàng (khách vãng lai dùng giỏ tạm và được **gộp** vào tài khoản khi đăng nhập); mã giảm giá + ví voucher; đặt hàng COD/QR (tạo đơn + trừ tồn kho + dùng voucher trong **một giao dịch**, chống bấm đúp); theo dõi và hủy đơn (hoàn tồn kho); quản lý đơn (chuyển trạng thái đúng thứ tự, hủy kèm lý do, nhật ký); dashboard thống kê; quản lý danh mục; quản lý tài khoản; log thao tác quan trọng ra `logs/app.log`.

**Chưa làm (ghi rõ để báo cáo trung thực):** quên mật khẩu qua email, yêu cầu đổi trả (chưa có bảng), form gửi đánh giá (chỉ hiển thị đánh giá), ưu đãi theo hạng thành viên khi thanh toán (mới hiển thị hạng), upload ảnh (dùng URL ảnh; không có thì hiện ảnh mặc định), token CSRF.

## 3. Chạy trên máy (local)

1. Cài **Node.js ≥ 18** và **SQL Server** (Developer/Express) — hoặc dùng Docker:
   ```bash
   docker run -e ACCEPT_EULA=Y -e MSSQL_SA_PASSWORD='Passw0rd!123' -p 1433:1433 -d mcr.microsoft.com/mssql/server:2022-latest
   ```
2. Mở `database/dailyman_local.sql` bằng SSMS / Azure Data Studio và chạy toàn bộ (tạo database `ThoiTrangNam`, bảng, dữ liệu mẫu). Bản chạy lại được nhiều lần.
3. ```bash
   npm install
   cp .env.example .env      # rồi sửa DB_USER / DB_PASSWORD cho đúng máy bạn
   npm start                 # mở http://localhost:3000
   ```
4. Kiểm tra nhanh không cần DB: `npm test` (dùng DB giả để thử toàn bộ route và view).

### Tài khoản demo (mật khẩu chung: `123456`)
| Vai trò | Email |
|---|---|
| Admin | duc.pham@shop.vn |
| Staff | cuong.le@shop.vn |
| Customer | an.nguyen@gmail.com · binh.tran@gmail.com · ha.hoang@gmail.com · khanh.vu@gmail.com |

Mã giảm giá mẫu: `DAILY10`, `FREESHIP30`, `GIAM10`, `WELCOME50` (ví của An có sẵn 3 mã).

## 4. Deploy (miễn phí): Render (web) + Azure SQL Database (CSDL)

> Ứng dụng dùng SQL Server nên cần một SQL Server đặt trên mạng. Gói miễn phí và điều kiện thay đổi theo thời gian, hãy kiểm tra lại trên trang chính thức khi làm.

**Bước 1 – CSDL (Azure SQL, gói free):** Azure Portal → tạo *SQL Database* → ở tab Basics bấm **Apply offer** (free offer) và chọn "Auto-pause" khi hết hạn mức → tạo xong, vào *Networking* bật **Allow Azure services** và thêm IP của bạn. Kết nối bằng SSMS/Azure Data Studio vào database đó và chạy `database/dailyman_cloud.sql`. (Gói free là serverless, tự ngủ khi rảnh nên lần truy cập đầu có thể chậm.)

**Bước 2 – Đẩy code lên GitHub** (xem `docs/PHAN_CHIA.md`).

**Bước 3 – Render:** *New → Web Service* (hoặc *Blueprint* dùng `render.yaml`) → chọn repo. Build: `npm install`, Start: `npm start`, Health check: `/healthz`. Thêm biến môi trường:

| Biến | Giá trị |
|---|---|
| `NODE_ENV` | `production` |
| `SESSION_SECRET` | chuỗi ngẫu nhiên dài |
| `DB_SERVER` | `ten-server.database.windows.net` |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` | theo Azure SQL |
| `DB_ENCRYPT` / `DB_TRUST_CERT` | `true` / `false` |
| `DISPLAY_TZ` | `Asia/Ho_Chi_Minh` |

Lưu ý gói free của Render: web tự ngủ sau khoảng 15 phút không có truy cập, lần mở đầu chậm vài chục giây. Nên mở trang trước giờ demo.

## 5. Lỗi thường gặp
- `Login failed for user` → sai `DB_USER/DB_PASSWORD`. `Failed to connect ... ECONNREFUSED` → SQL Server chưa bật TCP/IP port 1433 hoặc sai `DB_SERVER`.
- `self signed certificate` khi chạy local → đặt `DB_TRUST_CERT=true`, `DB_ENCRYPT=false`.
- Trên Azure: `Client with IP address ... is not allowed` → thêm IP/bật Allow Azure services trong Networking.
- Giờ hiển thị lệch 7 tiếng → chỉnh `DISPLAY_TZ` (DB cloud lưu giờ UTC → `Asia/Ho_Chi_Minh`; DB đặt ở máy VN → `UTC`).
