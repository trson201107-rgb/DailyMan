# DailyMan – Website quản lý thời trang nam thường nhật (ASP.NET Core MVC)

Chuyển từ bản Node.js/Express sang **ASP.NET Core MVC (.NET 10) + Entity Framework Core + SQL Server**.

## 1. Chạy dự án
1. Cài **.NET 10 SDK** và **SQL Server** (hoặc LocalDB đi kèm Visual Studio).
2. Mở `appsettings.json`, sửa chuỗi kết nối `DailyMan` cho đúng máy của bạn. Ví dụ LocalDB:
   `Server=(localdb)\\MSSQLLocalDB;Database=DailyManDb;Trusted_Connection=True;TrustServerCertificate=True;`
3. Visual Studio: mở `DailyMan.Web.csproj` → bấm F5. Dòng lệnh: `dotnet run`.
4. Lần chạy đầu tiên chương trình **tự tạo CSDL + dữ liệu mẫu** (46 sản phẩm, 15 tài khoản, 13 mã giảm giá, 90 đơn hàng).
   Muốn tạo lại từ đầu: xóa database `DailyManDb` rồi chạy lại.

Tài khoản mẫu (mật khẩu **123456**):
| Vai trò | Email |
|---|---|
| Admin | duc.pham@shop.vn · long.ngo@shop.vn |
| Nhân viên | cuong.le@shop.vn · trang.dang@shop.vn |
| Khách hàng | an.nguyen@gmail.com · binh.tran@gmail.com … |

Mã giảm giá thử: `DAILY10`, `WELCOME50`, `BLACKFRIDAY` (sự kiện) · `COMBO2THUN`, `COMBOAOQUAN` (combo) · `BAC8`, `VANG150` (cấp bậc).

## 2. Cấu trúc (mô hình MVC)
| Thư mục | Vai trò |
|---|---|
| `Models/` | Entity = bảng CSDL (`TaiKhoan`, `SanPham`, `Voucher`…) và hằng số `Const` |
| `Data/` | `AppDbContext` (EF Core) và `DbSeeder` (dữ liệu mẫu) |
| `Controllers/` | Phía khách: Home, Shop, Cart, Order, Account |
| `Areas/Admin/Controllers/` | Quản trị: Dashboard, Orders, Returns, Products, Categories, **Discounts**, **Accounts**, **Stats** |
| `Views/`, `Areas/Admin/Views/` | Giao diện Razor (.cshtml) |
| `Services/` | Nghiệp vụ dùng chung: giỏ hàng, tính tiền, mã giảm giá, đặt hàng, hạng thành viên, thống kê |
| `ViewModels/` | Dữ liệu truyền giữa Controller và View (kèm kiểm tra hợp lệ) |
| `wwwroot/` | CSS, JS, ảnh sản phẩm |

Đối chiếu với các tuần học: Tuần 4 (Overview) → `Program.cs`; Tuần 5 (Entity Framework) → `Data/`, `Models/`;
Tuần 6 (CRUD) → `Products`, `Categories`, `Discounts`, `Accounts`; Tuần 7 (Validation, Paging) → `ViewModels/*` (DataAnnotations), `Helpers/PagedList.cs`;
Authentication/Authorization → `AccountController` (đăng nhập Cookie) + `[Authorize(Roles = ...)]`.

## 3. Phần mới theo yêu cầu của thầy
* **Mã giảm giá cho quản trị & nhân viên** (`/admin/Discounts`): 3 trang riêng – *Giảm theo sự kiện*, *Giảm theo combo*, *Giảm theo cấp bậc*.
  Thêm / sửa / bật-tắt: Admin và Nhân viên đều làm được. Xóa mã và sửa bảng hạng thành viên: chỉ Admin.
  Khách nhập mã ở bước thanh toán; hệ thống kiểm tra hạn, lượt dùng, đơn tối thiểu, điều kiện combo, hạng tài khoản, mỗi khách dùng 1 mã 1 lần.
* **Tài khoản tách 3 nhóm** (`/admin/Accounts`): Quản trị viên · Nhân viên · Khách hàng (Nhân viên chỉ xem được Khách hàng).
* **Thống kê** (menu sổ xuống ngay dưới "Xem cửa hàng"): Tồn kho · Doanh thu · KPI & biểu đồ · Tỷ lệ hoàn / hủy đơn (kèm lý do hủy nhiều nhất) · Bán chạy & hết hàng · Bán chạy theo size, màu.
  Biểu đồ vẽ bằng CSS thuần nên chạy được cả khi không có Internet.
* **46 sản phẩm mẫu** trong 8 danh mục, kèm 102 ảnh thật theo từng màu (`wwwroot/images/products`, bản đồ ảnh ở `Data/ProductImages.cs`). Chọn màu ở trang sản phẩm thì ảnh đổi theo màu. Thêm / đổi ảnh ở trang *Sản phẩm → chi tiết → Thêm ảnh*.

## 4. Thay đổi CSDL so với bản cũ
* `DON_HANG` thêm cột `LyDoHuy`; `YEU_CAU_DOI_TRA` thêm cột `NhomLyDo` (phục vụ thống kê lý do).
* `VOUCHER` thêm `TenChuongTrinh`, `LoaiKM` (SuKien/Combo/CapBac), `GiamToiDa`, `DangBat`, `MaDM1/SoLuong1/MaDM2/SoLuong2` (combo), `MaHangToiThieu` (cấp bậc).
* `BIEN_THE` thêm `RowVersion` (chống 2 người mua cùng món cuối cùng).
* Chưa chuyển sang bản này: ví voucher, quên mật khẩu qua email, giỏ hàng cho khách chưa đăng nhập (giờ cần đăng nhập), thao tác hàng loạt trên danh sách đơn, nhật ký thao tác.

## 5. Nếu Windows chặn chương trình ("An Application Control policy has blocked this file")
Đây là tính năng **Smart App Control** của Windows chặn mọi chương trình tự build chưa có chữ ký, không phải lỗi code.
* Cách 1 (nhanh nhất): Windows Security → App & browser control → Smart App Control settings → **Off**, rồi chạy lại.
* Cách 2: chạy bằng Docker (không bị chặn). Cài Docker Desktop, mở terminal trong thư mục này và gõ `docker compose up --build`, chờ ~1–2 phút rồi vào http://localhost:8080.
