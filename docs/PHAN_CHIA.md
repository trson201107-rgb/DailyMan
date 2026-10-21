# Phân chia công việc cho 3 thành viên + quy trình Git

Cả nhóm dùng **một repository**. Mỗi người sở hữu các file riêng nên gần như không bị xung đột khi merge.

## Người 1 – Backend A: Sản phẩm (trọng tâm Sprint 2)
```
src/models/ProductModel.js        src/controllers/shopController.js
src/models/VariantModel.js        src/controllers/adminProductController.js
src/models/CategoryModel.js       src/controllers/adminCategoryController.js
src/routes/shop.routes.js         src/routes/admin.product.routes.js
```
Việc: CRUD sản phẩm, ẩn/hiện/xóa vĩnh viễn, biến thể + tồn kho, danh mục, tìm kiếm / lọc / sắp xếp / phân trang, Hot / Mới / sắp hết, create/update date & by.

## Người 2 – Backend B: Tài khoản, giỏ hàng, đơn hàng
```
src/models/UserModel.js    CartModel.js   VoucherModel.js   OrderModel.js   StatsModel.js
src/controllers/authController.js  cartController.js  orderController.js  adminOrderController.js
src/routes/auth.routes.js  cart.routes.js  admin.order.routes.js
src/middlewares/auth.js
```
Việc: đăng ký/đăng nhập/phân quyền, giỏ hàng + gộp giỏ, voucher, đặt hàng (giao dịch), theo dõi/hủy đơn, quản lý đơn, dashboard, quản lý tài khoản.

## Người 3 – Frontend
```
src/views/**      (partials/, shop/, auth/, admin/, error.ejs)
src/public/**     (css/style.css, js/main.js, img/)
```
Việc: toàn bộ giao diện (responsive), bộ lọc, trang chi tiết (chọn màu/size), giỏ hàng, thanh toán, trang quản trị, biểu đồ dashboard. Frontend **không viết SQL / nghiệp vụ**; chỉ dùng các biến mà controller truyền vào (xem `res.render('...', {...})` trong controller tương ứng; biến dùng chung: `user`, `flash`, `cartCount`, `h` (money, fmtDate), `urlWith`).

## File dùng chung (Trưởng nhóm đẩy lên trước – "gói 00-chung")
`package.json, .env.example, .gitignore, render.yaml, README.md, database/*, docs/*, tests/*,`
`src/app.js, src/server.js, src/config/*, src/utils/*, src/middlewares/common.js, src/routes/index.js`
Sửa file chung phải báo cả nhóm.

## Quy trình Git
```bash
# Trưởng nhóm (1 lần): tạo repo trống trên GitHub, rồi
git init && git add . && git commit -m "chore: khởi tạo project (file chung)"
git branch -M main && git remote add origin <URL_REPO> && git push -u origin main

# Mỗi thành viên
git clone <URL_REPO> && cd dailyman
git checkout -b feature/backend-a        # hoặc feature/backend-b, feature/frontend
# chép các file của mình vào đúng đường dẫn (giải nén gói 01 / 02 / 03 vào thư mục project)
git add . && git commit -m "feat: phần việc của mình"
git push -u origin feature/backend-a     # rồi tạo Pull Request vào main
```
Merge cả 3 nhánh vào `main` rồi mới chạy được toàn bộ (các phần gọi lẫn nhau: `common.js` dùng `CartModel`, mọi controller dùng views). Sau khi merge: `npm install && npm test && npm start`.

## Đối chiếu bảng Sprint 2 của thầy
| Ghi trên bảng | Đã làm ở |
|---|---|
| connect db → CRUD | `config/db.js`, `models/ProductModel.js` |
| Status 1/0, Xóa → Ẩn → Remove | `ProductModel.hide/show/remove`, nút Ẩn / Hiện lại / Xóa hẳn trong `admin/products.ejs` |
| Thêm SP – phụ thuộc (danh mục, màu, size) | `adminProductController.create` + `product-form.ejs` |
| Sửa; SX (giá, tên, DM) | `update`, `SORT_ADMIN`, `SORT_SHOP` |
| TK: tên, DM, giá, mới, hot → Filter | `buildWhere()` trong `ProductModel` |
| Phân trang, danh sách trống | `pageInfo/pageMeta`, `partials/pagination.ejs`, thông báo "Không tìm thấy" |
| Hiển thị chi tiết 1 SP | `shop/product-detail.ejs`, `admin/product-detail.ejs` |
| create date / update date / create by / update by | cột `NgayTao, NgayCapNhat, NguoiTao, NguoiCapNhat` |
| Hot, new, liên quan; sắp hết / hết hàng | `LaHot`, `LaMoi`, `ProductModel.related`, bộ lọc trạng thái admin |
