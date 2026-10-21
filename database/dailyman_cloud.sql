-- =====================================================================
-- CSDL: WEBSITE QUẢN LÝ THỜI TRANG NAM THƯỜNG NHẬT (dailyman) – SQL Server
-- Dựa trên CSDL Sprint 1 của nhóm, bổ sung cho Sprint 2:
--   * SAN_PHAM: NgayCapNhat, NguoiTao, NguoiCapNhat, LuotXem (create/update date & by, Hot)
--   * KICH_CO: thêm size XXL, Free; thêm nhiều dữ liệu mẫu (16 sản phẩm, 80 biến thể, 10 đơn hàng)
--   * Mật khẩu tất cả tài khoản demo: 123456 (đã băm bcrypt)
-- =====================================================================
-- DÙNG CHO AZURE SQL / HOST SQL SERVER ĐÃ CÓ SẴN DATABASE: kết nối vào database rồi chạy toàn bộ file này.
-- (Không có lệnh CREATE DATABASE / USE vì các dịch vụ cloud không cho phép)
-- Xóa bảng cũ (chạy lại script nhiều lần không lỗi)
DROP TABLE IF EXISTS DANH_GIA;
DROP TABLE IF EXISTS LICH_SU_DON_HANG;
DROP TABLE IF EXISTS THANH_TOAN;
DROP TABLE IF EXISTS CHI_TIET_DON_HANG;
DROP TABLE IF EXISTS DON_HANG;
DROP TABLE IF EXISTS PHUONG_THUC_THANH_TOAN;
DROP TABLE IF EXISTS TRANG_THAI_DON;
DROP TABLE IF EXISTS VI_VOUCHER;
DROP TABLE IF EXISTS VOUCHER;
DROP TABLE IF EXISTS CHI_TIET_GIO_HANG;
DROP TABLE IF EXISTS GIO_HANG;
DROP TABLE IF EXISTS BIEN_THE;
DROP TABLE IF EXISTS KICH_CO;
DROP TABLE IF EXISTS MAU_SAC;
DROP TABLE IF EXISTS SAN_PHAM;
DROP TABLE IF EXISTS DANH_MUC;
DROP TABLE IF EXISTS TAI_KHOAN;
DROP TABLE IF EXISTS HANG_THANH_VIEN;
DROP TABLE IF EXISTS VAI_TRO;
DROP VIEW IF EXISTS vw_TongTienDonHang;
GO

-- ---------------------------------------------------------------------
-- 1. NHÓM TÀI KHOẢN VÀ THÀNH VIÊN
-- ---------------------------------------------------------------------
CREATE TABLE VAI_TRO (
    MaVaiTro    INT IDENTITY(1,1) NOT NULL,
    TenVaiTro   NVARCHAR(30)      NOT NULL,
    CONSTRAINT PK_VAI_TRO PRIMARY KEY (MaVaiTro),
    CONSTRAINT UQ_VAI_TRO_Ten UNIQUE (TenVaiTro)
);

CREATE TABLE HANG_THANH_VIEN (
    MaHang           INT IDENTITY(1,1) NOT NULL,
    TenHang          NVARCHAR(30)      NOT NULL,
    ChiTieuToiThieu  DECIMAL(12,0)     NOT NULL DEFAULT 0,
    PhanTramUuDai    INT               NOT NULL DEFAULT 0,
    CONSTRAINT PK_HANG_THANH_VIEN PRIMARY KEY (MaHang),
    CONSTRAINT UQ_HANG_Ten UNIQUE (TenHang),
    CONSTRAINT CK_HANG_UuDai CHECK (PhanTramUuDai BETWEEN 0 AND 100)
);

CREATE TABLE TAI_KHOAN (
    MaTK              INT IDENTITY(1,1) NOT NULL,
    HoTen             NVARCHAR(100)     NOT NULL,
    Email             VARCHAR(100)      NOT NULL,
    MatKhauHash       VARCHAR(255)      NOT NULL,
    SoDienThoai       VARCHAR(15)       NOT NULL,
    TrangThai         NVARCHAR(20)      NOT NULL DEFAULT N'Hoạt động',
    SoLanDangNhapSai  INT               NOT NULL DEFAULT 0,
    KhoaDen           DATETIME2         NULL,
    NgayTao           DATETIME2         NOT NULL DEFAULT SYSDATETIME(),
    MaVaiTro          INT               NOT NULL,
    MaHang            INT               NULL,      -- chỉ áp dụng cho Customer
    CONSTRAINT PK_TAI_KHOAN PRIMARY KEY (MaTK),
    CONSTRAINT UQ_TK_Email UNIQUE (Email),
    CONSTRAINT UQ_TK_SDT UNIQUE (SoDienThoai),
    CONSTRAINT CK_TK_TrangThai CHECK (TrangThai IN (N'Hoạt động', N'Bị khóa')),
    CONSTRAINT FK_TK_VaiTro FOREIGN KEY (MaVaiTro) REFERENCES VAI_TRO(MaVaiTro),
    CONSTRAINT FK_TK_Hang   FOREIGN KEY (MaHang)   REFERENCES HANG_THANH_VIEN(MaHang)
);

-- ---------------------------------------------------------------------
-- 2. NHÓM SẢN PHẨM VÀ TỒN KHO
-- ---------------------------------------------------------------------
CREATE TABLE DANH_MUC (
    MaDM    INT IDENTITY(1,1) NOT NULL,
    TenDM   NVARCHAR(50)      NOT NULL,
    MoTa    NVARCHAR(255)     NULL,
    CONSTRAINT PK_DANH_MUC PRIMARY KEY (MaDM),
    CONSTRAINT UQ_DM_Ten UNIQUE (TenDM)
);

CREATE TABLE SAN_PHAM (
    MaSP        INT IDENTITY(1,1) NOT NULL,
    TenSP       NVARCHAR(150)     NOT NULL,
    MoTa        NVARCHAR(1000)    NULL,
    GiaBan      DECIMAL(12,0)     NOT NULL,
    AnhDaiDien  VARCHAR(255)      NULL,
    TrangThai   NVARCHAR(20)      NOT NULL DEFAULT N'Đang bán',
    NgayTao     DATETIME2         NOT NULL DEFAULT SYSDATETIME(),
    NgayCapNhat DATETIME2         NULL,                 -- Sprint 2: update date
    NguoiTao    INT               NULL,                 -- Sprint 2: create by  (TAI_KHOAN.MaTK)
    NguoiCapNhat INT              NULL,                 -- Sprint 2: update by  (TAI_KHOAN.MaTK)
    LuotXem     INT               NOT NULL DEFAULT 0,   -- Sprint 2: dùng xác định sản phẩm Hot
    MaDM        INT               NOT NULL,
    CONSTRAINT PK_SAN_PHAM PRIMARY KEY (MaSP),
    CONSTRAINT CK_SP_Gia CHECK (GiaBan >= 0),
    CONSTRAINT CK_SP_TrangThai CHECK (TrangThai IN (N'Đang bán', N'Ngừng bán')),
    CONSTRAINT FK_SP_DM FOREIGN KEY (MaDM) REFERENCES DANH_MUC(MaDM),
    CONSTRAINT FK_SP_NguoiTao FOREIGN KEY (NguoiTao) REFERENCES TAI_KHOAN(MaTK),
    CONSTRAINT FK_SP_NguoiCapNhat FOREIGN KEY (NguoiCapNhat) REFERENCES TAI_KHOAN(MaTK),
    CONSTRAINT CK_SP_LuotXem CHECK (LuotXem >= 0)
);

CREATE TABLE MAU_SAC (
    MaMau   INT IDENTITY(1,1) NOT NULL,
    TenMau  NVARCHAR(30)      NOT NULL,
    MaHex   CHAR(7)           NULL,
    CONSTRAINT PK_MAU_SAC PRIMARY KEY (MaMau),
    CONSTRAINT UQ_MAU_Ten UNIQUE (TenMau)
);

CREATE TABLE KICH_CO (
    MaSize     INT IDENTITY(1,1) NOT NULL,
    TenSize    VARCHAR(10)       NOT NULL,
    ThuTu      INT               NOT NULL,          -- để sắp xếp S < M < L < XL
    CONSTRAINT PK_KICH_CO PRIMARY KEY (MaSize),
    CONSTRAINT UQ_SIZE_Ten UNIQUE (TenSize)
);

CREATE TABLE BIEN_THE (
    MaBT        INT IDENTITY(1,1) NOT NULL,
    SKU         VARCHAR(30)       NOT NULL,
    SoLuongTon  INT               NOT NULL DEFAULT 0,
    MaSP        INT               NOT NULL,
    MaMau       INT               NOT NULL,
    MaSize      INT               NOT NULL,
    CONSTRAINT PK_BIEN_THE PRIMARY KEY (MaBT),
    CONSTRAINT UQ_BT_SKU UNIQUE (SKU),
    CONSTRAINT UQ_BT_SP_Mau_Size UNIQUE (MaSP, MaMau, MaSize),
    CONSTRAINT CK_BT_Ton CHECK (SoLuongTon >= 0),   -- không bán vượt tồn kho
    CONSTRAINT FK_BT_SP   FOREIGN KEY (MaSP)   REFERENCES SAN_PHAM(MaSP),
    CONSTRAINT FK_BT_Mau  FOREIGN KEY (MaMau)  REFERENCES MAU_SAC(MaMau),
    CONSTRAINT FK_BT_Size FOREIGN KEY (MaSize) REFERENCES KICH_CO(MaSize)
);

-- ---------------------------------------------------------------------
-- 3. NHÓM GIỎ HÀNG
-- ---------------------------------------------------------------------
CREATE TABLE GIO_HANG (
    MaGH          INT IDENTITY(1,1) NOT NULL,
    NgayCapNhat   DATETIME2         NOT NULL DEFAULT SYSDATETIME(),
    MaTK          INT               NOT NULL,
    CONSTRAINT PK_GIO_HANG PRIMARY KEY (MaGH),
    CONSTRAINT UQ_GH_TK UNIQUE (MaTK),               -- quan hệ 1-1 với TAI_KHOAN
    CONSTRAINT FK_GH_TK FOREIGN KEY (MaTK) REFERENCES TAI_KHOAN(MaTK)
);

CREATE TABLE CHI_TIET_GIO_HANG (
    MaGH     INT NOT NULL,
    MaBT     INT NOT NULL,
    SoLuong  INT NOT NULL DEFAULT 1,
    CONSTRAINT PK_CT_GIO_HANG PRIMARY KEY (MaGH, MaBT),
    CONSTRAINT CK_CTGH_SoLuong CHECK (SoLuong > 0),
    CONSTRAINT FK_CTGH_GH FOREIGN KEY (MaGH) REFERENCES GIO_HANG(MaGH) ON DELETE CASCADE,
    CONSTRAINT FK_CTGH_BT FOREIGN KEY (MaBT) REFERENCES BIEN_THE(MaBT)
);

-- ---------------------------------------------------------------------
-- 4. NHÓM KHUYẾN MÃI
-- ---------------------------------------------------------------------
CREATE TABLE VOUCHER (
    MaVoucher          INT IDENTITY(1,1) NOT NULL,
    MaCode             VARCHAR(30)       NOT NULL,
    LoaiGiam           VARCHAR(10)       NOT NULL,     -- PHAN_TRAM | TIEN
    GiaTriGiam         DECIMAL(12,0)     NOT NULL,
    DonToiThieu        DECIMAL(12,0)     NOT NULL DEFAULT 0,
    SoLuotConLai       INT               NOT NULL,
    NgayBatDau         DATE              NOT NULL,
    NgayHetHan         DATE              NOT NULL,
    CONSTRAINT PK_VOUCHER PRIMARY KEY (MaVoucher),
    CONSTRAINT UQ_VOUCHER_Code UNIQUE (MaCode),
    CONSTRAINT CK_VOUCHER_Loai CHECK (LoaiGiam IN ('PHAN_TRAM', 'TIEN')),
    CONSTRAINT CK_VOUCHER_Ngay CHECK (NgayHetHan >= NgayBatDau)
);

CREATE TABLE VI_VOUCHER (
    MaTK        INT       NOT NULL,
    MaVoucher   INT       NOT NULL,
    NgayNhan    DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    DaSuDung    BIT       NOT NULL DEFAULT 0,
    CONSTRAINT PK_VI_VOUCHER PRIMARY KEY (MaTK, MaVoucher),
    CONSTRAINT FK_VV_TK      FOREIGN KEY (MaTK)      REFERENCES TAI_KHOAN(MaTK),
    CONSTRAINT FK_VV_Voucher FOREIGN KEY (MaVoucher) REFERENCES VOUCHER(MaVoucher)
);

-- ---------------------------------------------------------------------
-- 5. NHÓM ĐƠN HÀNG VÀ THANH TOÁN
-- ---------------------------------------------------------------------
CREATE TABLE TRANG_THAI_DON (
    MaTrangThai   INT IDENTITY(1,1) NOT NULL,
    TenTrangThai  NVARCHAR(30)      NOT NULL,
    CONSTRAINT PK_TRANG_THAI_DON PRIMARY KEY (MaTrangThai),
    CONSTRAINT UQ_TTD_Ten UNIQUE (TenTrangThai)
);

CREATE TABLE PHUONG_THUC_THANH_TOAN (
    MaPT   INT IDENTITY(1,1) NOT NULL,
    TenPT  NVARCHAR(30)      NOT NULL,
    CONSTRAINT PK_PTTT PRIMARY KEY (MaPT),
    CONSTRAINT UQ_PTTT_Ten UNIQUE (TenPT)
);

CREATE TABLE DON_HANG (
    MaDH            INT IDENTITY(1,1) NOT NULL,
    NgayDat         DATETIME2         NOT NULL DEFAULT SYSDATETIME(),
    TenNguoiNhan    NVARCHAR(100)     NOT NULL,
    SDTNguoiNhan    VARCHAR(15)       NOT NULL,
    DiaChiGiao      NVARCHAR(255)     NOT NULL,
    PhiVanChuyen    DECIMAL(12,0)     NOT NULL DEFAULT 0,
    TienGiam        DECIMAL(12,0)     NOT NULL DEFAULT 0,
    GhiChu          NVARCHAR(255)     NULL,
    MaTK            INT               NOT NULL,
    MaTrangThai     INT               NOT NULL,
    MaVoucher       INT               NULL,          -- mỗi đơn áp dụng tối đa 1 mã
    CONSTRAINT PK_DON_HANG PRIMARY KEY (MaDH),
    CONSTRAINT FK_DH_TK        FOREIGN KEY (MaTK)        REFERENCES TAI_KHOAN(MaTK),
    CONSTRAINT FK_DH_TrangThai FOREIGN KEY (MaTrangThai) REFERENCES TRANG_THAI_DON(MaTrangThai),
    CONSTRAINT FK_DH_Voucher   FOREIGN KEY (MaVoucher)   REFERENCES VOUCHER(MaVoucher)
);

CREATE TABLE CHI_TIET_DON_HANG (
    MaDH INT NOT NULL,
    MaBT INT NOT NULL,
    SoLuong INT NOT NULL,
    DonGia DECIMAL(12,0) NOT NULL,

    CONSTRAINT PK_CT_DON_HANG PRIMARY KEY (MaDH, MaBT),
    CONSTRAINT CK_CTDH_SoLuong CHECK (SoLuong > 0),
    CONSTRAINT FK_CTDH_DH FOREIGN KEY (MaDH) REFERENCES DON_HANG(MaDH),
    CONSTRAINT FK_CTDH_BT FOREIGN KEY (MaBT) REFERENCES BIEN_THE(MaBT)
);

CREATE TABLE THANH_TOAN (
    MaTT            INT IDENTITY(1,1) NOT NULL,
    SoTien          DECIMAL(12,0)     NOT NULL,
    TrangThaiTT     NVARCHAR(20)      NOT NULL DEFAULT N'Chưa thanh toán',
    NgayThanhToan   DATETIME2         NULL,
    MaDH            INT               NOT NULL,
    MaPT            INT               NOT NULL,
    CONSTRAINT PK_THANH_TOAN PRIMARY KEY (MaTT),
    CONSTRAINT UQ_TT_DH UNIQUE (MaDH),               -- quan hệ 1-1 với DON_HANG
    CONSTRAINT CK_TT_TrangThai CHECK (TrangThaiTT IN (N'Chưa thanh toán', N'Đã thanh toán')),
    CONSTRAINT FK_TT_DH FOREIGN KEY (MaDH) REFERENCES DON_HANG(MaDH),
    CONSTRAINT FK_TT_PT FOREIGN KEY (MaPT) REFERENCES PHUONG_THUC_THANH_TOAN(MaPT)
);

CREATE TABLE LICH_SU_DON_HANG (
    MaLS         INT IDENTITY(1,1) NOT NULL,
    ThoiGian     DATETIME2         NOT NULL DEFAULT SYSDATETIME(),
    GhiChu       NVARCHAR(255)     NULL,
    MaDH         INT               NOT NULL,
    MaTrangThai  INT               NOT NULL,
    MaNguoiDoi   INT               NULL,            -- NULL nếu hệ thống tự động
    CONSTRAINT PK_LICH_SU_DH PRIMARY KEY (MaLS),
    CONSTRAINT FK_LS_DH        FOREIGN KEY (MaDH)        REFERENCES DON_HANG(MaDH),
    CONSTRAINT FK_LS_TrangThai FOREIGN KEY (MaTrangThai) REFERENCES TRANG_THAI_DON(MaTrangThai),
    CONSTRAINT FK_LS_NguoiDoi  FOREIGN KEY (MaNguoiDoi)  REFERENCES TAI_KHOAN(MaTK)
);

-- ---------------------------------------------------------------------
-- 6. ĐÁNH GIÁ SẢN PHẨM
-- ---------------------------------------------------------------------
CREATE TABLE DANH_GIA (
    MaDG INT IDENTITY(1,1) NOT NULL,
    SoSao INT NOT NULL,
    NoiDung NVARCHAR(500) NULL,
    NgayDG DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    MaTK INT NOT NULL,
    MaSP INT NOT NULL,

    CONSTRAINT PK_DANH_GIA PRIMARY KEY (MaDG),
    CONSTRAINT UQ_DG_TK_SP UNIQUE (MaTK, MaSP),
    CONSTRAINT CK_DG_SoSao CHECK (SoSao BETWEEN 1 AND 5),
    CONSTRAINT FK_DG_TK FOREIGN KEY (MaTK) REFERENCES TAI_KHOAN(MaTK),
    CONSTRAINT FK_DG_SP FOREIGN KEY (MaSP) REFERENCES SAN_PHAM(MaSP)
);
GO

GO
-- =====================================================================
-- DỮ LIỆU MẪU
-- =====================================================================
INSERT INTO VAI_TRO (TenVaiTro) VALUES (N'Customer'), (N'Staff'), (N'Admin');
INSERT INTO HANG_THANH_VIEN (TenHang, ChiTieuToiThieu, PhanTramUuDai) VALUES (N'Đồng', 0, 5), (N'Bạc', 3000000, 10), (N'Vàng', 7000000, 15), (N'Kim cương', 15000000, 20);
INSERT INTO TAI_KHOAN (HoTen, Email, MatKhauHash, SoDienThoai, MaVaiTro, MaHang) VALUES
(N'Nguyễn Văn An', 'an.nguyen@gmail.com', '$2a$10$AjYPkK8cZow6SMOB8NuLnOBxriNIS02vJk8lLy4a85pc2cMvuxEli', '0901000001', 1, 1),
(N'Trần Thị Bình', 'binh.tran@gmail.com', '$2a$10$AjYPkK8cZow6SMOB8NuLnOBxriNIS02vJk8lLy4a85pc2cMvuxEli', '0901000002', 1, 2),
(N'Lê Quốc Cường', 'cuong.le@shop.vn', '$2a$10$AjYPkK8cZow6SMOB8NuLnOBxriNIS02vJk8lLy4a85pc2cMvuxEli', '0901000003', 2, NULL),
(N'Phạm Minh Đức', 'duc.pham@shop.vn', '$2a$10$AjYPkK8cZow6SMOB8NuLnOBxriNIS02vJk8lLy4a85pc2cMvuxEli', '0901000004', 3, NULL),
(N'Hoàng Thu Hà', 'ha.hoang@gmail.com', '$2a$10$AjYPkK8cZow6SMOB8NuLnOBxriNIS02vJk8lLy4a85pc2cMvuxEli', '0901000005', 1, 1),
(N'Vũ Đức Khánh', 'khanh.vu@gmail.com', '$2a$10$AjYPkK8cZow6SMOB8NuLnOBxriNIS02vJk8lLy4a85pc2cMvuxEli', '0901000006', 1, 1);
INSERT INTO DANH_MUC (TenDM, MoTa) VALUES
(N'Áo thun', N'Áo thun nam thường nhật'),
(N'Áo sơ mi', N'Sơ mi nam công sở và dạo phố'),
(N'Quần jeans', N'Quần jeans nam'),
(N'Quần kaki', N'Quần kaki nam'),
(N'Phụ kiện', N'Nón, thắt lưng, ví');
INSERT INTO MAU_SAC (TenMau, MaHex) VALUES
(N'Trắng', '#FFFFFF'),
(N'Đen', '#000000'),
(N'Xanh navy', '#1F2A44'),
(N'Xám', '#808080'),
(N'Be', '#D8C3A5'),
(N'Nâu', '#6B4423'),
(N'Xanh denim', '#3B5B8C');
INSERT INTO KICH_CO (TenSize, ThuTu) VALUES
('S', 1),
('M', 2),
('L', 3),
('XL', 4),
('XXL', 5),
('Free', 6);
-- SAN_PHAM: NgayTao lùi theo số ngày để có sản phẩm 'Mới' và 'Cũ'; LuotXem cao = 'Hot'
INSERT INTO SAN_PHAM (TenSP, MoTa, GiaBan, TrangThai, NgayTao, NgayCapNhat, NguoiTao, NguoiCapNhat, LuotXem, MaDM) VALUES
(N'Áo thun cotton basic', N'Cotton 100%, form regular, thấm hút tốt', 199000, N'Đang bán', DATEADD(DAY,-90,SYSDATETIME()), DATEADD(DAY,-87,SYSDATETIME()), 4, 4, 320, 1),
(N'Áo sơ mi Oxford tay dài', N'Vải Oxford dày dặn, ít nhăn', 359000, N'Đang bán', DATEADD(DAY,-70,SYSDATETIME()), DATEADD(DAY,-67,SYSDATETIME()), 4, 4, 180, 2),
(N'Quần jeans slim-fit', N'Denim co giãn nhẹ, ôm vừa phải', 459000, N'Đang bán', DATEADD(DAY,-60,SYSDATETIME()), DATEADD(DAY,-57,SYSDATETIME()), 4, 4, 260, 3),
(N'Quần kaki ống đứng', N'Kaki cotton, đứng form', 399000, N'Đang bán', DATEADD(DAY,-55,SYSDATETIME()), DATEADD(DAY,-52,SYSDATETIME()), 4, 4, 140, 4),
(N'Áo polo pique thể thao', N'Vải pique thoáng khí, cổ bẻ', 259000, N'Đang bán', DATEADD(DAY,-12,SYSDATETIME()), DATEADD(DAY,-9,SYSDATETIME()), 4, 4, 150, 1),
(N'Áo thun oversize in hình', N'Form rộng, in hình phong cách đường phố', 229000, N'Đang bán', DATEADD(DAY,-5,SYSDATETIME()), DATEADD(DAY,-2,SYSDATETIME()), 4, 4, 60, 1),
(N'Áo thun cổ tròn trơn', N'Áo thun trơn, mặc lót hoặc mặc ngoài', 179000, N'Ngừng bán', DATEADD(DAY,-200,SYSDATETIME()), DATEADD(DAY,-197,SYSDATETIME()), 4, 4, 15, 1),
(N'Áo sơ mi linen ngắn tay', N'Linen mát, phù hợp mùa hè', 329000, N'Đang bán', DATEADD(DAY,-20,SYSDATETIME()), DATEADD(DAY,-17,SYSDATETIME()), 4, 4, 110, 2),
(N'Áo sơ mi flannel caro', N'Flannel mềm, họa tiết caro', 389000, N'Đang bán', DATEADD(DAY,-8,SYSDATETIME()), DATEADD(DAY,-5,SYSDATETIME()), 4, 4, 45, 2),
(N'Quần jeans baggy ống rộng', N'Denim dày, ống rộng thời trang', 499000, N'Đang bán', DATEADD(DAY,-25,SYSDATETIME()), DATEADD(DAY,-22,SYSDATETIME()), 4, 4, 205, 3),
(N'Quần jeans straight xanh đậm', N'Form straight cổ điển', 439000, N'Đang bán', DATEADD(DAY,-40,SYSDATETIME()), DATEADD(DAY,-37,SYSDATETIME()), 4, 4, 95, 3),
(N'Quần kaki jogger', N'Kaki co giãn, bo gấu', 369000, N'Đang bán', DATEADD(DAY,-15,SYSDATETIME()), DATEADD(DAY,-12,SYSDATETIME()), 4, 4, 70, 4),
(N'Quần short kaki', N'Short kaki đi biển, dạo phố', 299000, N'Ngừng bán', DATEADD(DAY,-100,SYSDATETIME()), DATEADD(DAY,-97,SYSDATETIME()), 4, 4, 25, 4),
(N'Nón lưỡi trai basic', N'Nón cotton thêu logo', 149000, N'Đang bán', DATEADD(DAY,-30,SYSDATETIME()), DATEADD(DAY,-27,SYSDATETIME()), 4, 4, 130, 5),
(N'Thắt lưng da bò', N'Da bò thật, khóa kim loại', 249000, N'Đang bán', DATEADD(DAY,-45,SYSDATETIME()), DATEADD(DAY,-42,SYSDATETIME()), 4, 4, 85, 5),
(N'Ví da nam gấp đôi', N'Ví da PU cao cấp nhiều ngăn', 329000, N'Đang bán', DATEADD(DAY,-18,SYSDATETIME()), DATEADD(DAY,-15,SYSDATETIME()), 4, 4, 100, 5);
INSERT INTO BIEN_THE (SKU, SoLuongTon, MaSP, MaMau, MaSize) VALUES
('AT-BASIC-TRG-S', 11, 1, 1, 1),
('AT-BASIC-TRG-M', 25, 1, 1, 2),
('AT-BASIC-TRG-L', 17, 1, 1, 3),
('AT-BASIC-TRG-XL', 20, 1, 1, 4),
('AT-BASIC-DEN-S', 16, 1, 2, 1),
('AT-BASIC-DEN-M', 19, 1, 2, 2),
('AT-BASIC-DEN-L', 18, 1, 2, 3),
('AT-BASIC-DEN-XL', 1, 1, 2, 4),
('AT-BASIC-XAM-S', 21, 1, 4, 1),
('AT-BASIC-XAM-M', 0, 1, 4, 2),
('AT-BASIC-XAM-L', 3, 1, 4, 3),
('AT-BASIC-XAM-XL', 6, 1, 4, 4),
('SM-OXF-TRG-M', 12, 2, 1, 2),
('SM-OXF-TRG-L', 0, 2, 1, 3),
('SM-OXF-TRG-XL', 0, 2, 1, 4),
('SM-OXF-NAV-M', 23, 2, 3, 2),
('SM-OXF-NAV-L', 2, 2, 3, 3),
('SM-OXF-NAV-XL', 5, 2, 3, 4),
('QJ-SLIM-NAV-M', 1, 3, 3, 2),
('QJ-SLIM-NAV-L', 10, 3, 3, 3),
('QJ-SLIM-NAV-XL', 7, 3, 3, 4),
('QJ-SLIM-DEN-M', 6, 3, 2, 2),
('QJ-SLIM-DEN-L', 9, 3, 2, 3),
('QJ-SLIM-DEN-XL', 6, 3, 2, 4),
('QK-ONGDUNG-DEN-M', 15, 4, 2, 2),
('QK-ONGDUNG-DEN-L', 11, 4, 2, 3),
('QK-ONGDUNG-BE-M', 13, 4, 5, 2),
('QK-ONGDUNG-BE-L', 16, 4, 5, 3),
('AT-POLO-TRG-M', 15, 5, 1, 2),
('AT-POLO-TRG-L', 18, 5, 1, 3),
('AT-POLO-TRG-XL', 21, 5, 1, 4),
('AT-POLO-NAV-M', 20, 5, 3, 2),
('AT-POLO-NAV-L', 23, 5, 3, 3),
('AT-POLO-NAV-XL', 2, 5, 3, 4),
('AT-POLO-DEN-M', 1, 5, 2, 2),
('AT-POLO-DEN-L', 4, 5, 2, 3),
('AT-POLO-DEN-XL', 7, 5, 2, 4),
('AT-OVER-DEN-M', 0, 6, 2, 2),
('AT-OVER-DEN-L', 0, 6, 2, 3),
('AT-OVER-TRG-M', 0, 6, 1, 2),
('AT-OVER-TRG-L', 0, 6, 1, 3),
('AT-TRON-TRG-M', 5, 7, 1, 2),
('AT-TRON-TRG-L', 8, 7, 1, 3),
('AT-TRON-XAM-M', 10, 7, 4, 2),
('AT-TRON-XAM-L', 13, 7, 4, 3),
('SM-LINEN-BE-M', 12, 8, 5, 2),
('SM-LINEN-BE-L', 15, 8, 5, 3),
('SM-LINEN-BE-XL', 18, 8, 5, 4),
('SM-LINEN-TRG-M', 17, 8, 1, 2),
('SM-LINEN-TRG-L', 20, 8, 1, 3),
('SM-LINEN-TRG-XL', 23, 8, 1, 4),
('SM-FLAN-NAU-M', 3, 9, 6, 2),
('SM-FLAN-NAU-L', 0, 9, 6, 3),
('SM-FLAN-NAV-M', 4, 9, 3, 2),
('SM-FLAN-NAV-L', 2, 9, 3, 3),
('QJ-BAGGY-DNM-M', 2, 10, 7, 2),
('QJ-BAGGY-DNM-L', 5, 10, 7, 3),
('QJ-BAGGY-DNM-XL', 8, 10, 7, 4),
('QJ-BAGGY-DEN-M', 7, 10, 2, 2),
('QJ-BAGGY-DEN-L', 10, 10, 2, 3),
('QJ-BAGGY-DEN-XL', 13, 10, 2, 4),
('QJ-STRAIGHT-DNM-M', 9, 11, 7, 2),
('QJ-STRAIGHT-DNM-L', 12, 11, 7, 3),
('QJ-STRAIGHT-DNM-XL', 15, 11, 7, 4),
('QJ-STRAIGHT-DNM-XXL', 18, 11, 7, 5),
('QK-JOGGER-XAM-M', 1, 12, 4, 2),
('QK-JOGGER-XAM-L', 2, 12, 4, 3),
('QK-JOGGER-DEN-M', 3, 12, 2, 2),
('QK-JOGGER-DEN-L', 0, 12, 2, 3),
('QK-SHORT-BE-M', 23, 13, 5, 2),
('QK-SHORT-BE-L', 2, 13, 5, 3),
('QK-SHORT-NAU-M', 4, 13, 6, 2),
('QK-SHORT-NAU-L', 7, 13, 6, 3),
('PK-NON-DEN-FREE', 6, 14, 2, 6),
('PK-NON-BE-FREE', 11, 14, 5, 6),
('PK-NON-NAV-FREE', 16, 14, 3, 6),
('PK-TL-DEN-FREE', 13, 15, 2, 6),
('PK-TL-NAU-FREE', 18, 15, 6, 6),
('PK-VI-DEN-FREE', 20, 16, 2, 6),
('PK-VI-NAU-FREE', 1, 16, 6, 6);
INSERT INTO GIO_HANG (MaTK) VALUES (1), (2), (5), (6);
INSERT INTO CHI_TIET_GIO_HANG (MaGH, MaBT, SoLuong) VALUES
(1, (SELECT MaBT FROM BIEN_THE WHERE SKU='AT-BASIC-TRG-M'), 2),
(1, (SELECT MaBT FROM BIEN_THE WHERE SKU='QJ-SLIM-NAV-L'), 1),
(2, (SELECT MaBT FROM BIEN_THE WHERE SKU='SM-OXF-TRG-M'), 1),
(3, (SELECT MaBT FROM BIEN_THE WHERE SKU='AT-POLO-DEN-L'), 1);
INSERT INTO VOUCHER (MaCode, LoaiGiam, GiaTriGiam, DonToiThieu, SoLuotConLai, NgayBatDau, NgayHetHan) VALUES
('FREESHIP30', 'TIEN', 30000, 300000, 98, '2026-01-01', '2027-12-31'),
('GIAM10', 'PHAN_TRAM', 10, 500000, 50, '2026-01-01', '2027-12-31'),
('DAILY10', 'PHAN_TRAM', 10, 300000, 198, '2026-01-01', '2027-12-31'),
('WELCOME50', 'TIEN', 50000, 400000, 100, '2026-01-01', '2027-12-31');
INSERT INTO VI_VOUCHER (MaTK, MaVoucher) VALUES
(1, (SELECT MaVoucher FROM VOUCHER WHERE MaCode='FREESHIP30')),
(1, (SELECT MaVoucher FROM VOUCHER WHERE MaCode='GIAM10')),
(1, (SELECT MaVoucher FROM VOUCHER WHERE MaCode='DAILY10')),
(2, (SELECT MaVoucher FROM VOUCHER WHERE MaCode='FREESHIP30')),
(2, (SELECT MaVoucher FROM VOUCHER WHERE MaCode='DAILY10')),
(5, (SELECT MaVoucher FROM VOUCHER WHERE MaCode='WELCOME50')),
(5, (SELECT MaVoucher FROM VOUCHER WHERE MaCode='DAILY10')),
(6, (SELECT MaVoucher FROM VOUCHER WHERE MaCode='DAILY10'));
INSERT INTO TRANG_THAI_DON (TenTrangThai) VALUES (N'Chờ xác nhận'), (N'Đã xác nhận'), (N'Đang đóng gói'), (N'Đang giao'), (N'Hoàn thành'), (N'Đã hủy');
INSERT INTO PHUONG_THUC_THANH_TOAN (TenPT) VALUES (N'COD'), (N'QR');
-- 10 đơn hàng mẫu ở đủ các trạng thái (ngày đặt tính lùi từ hôm nay để dashboard có số liệu)
INSERT INTO DON_HANG (NgayDat, TenNguoiNhan, SDTNguoiNhan, DiaChiGiao, PhiVanChuyen, TienGiam, MaTK, MaTrangThai, MaVoucher) VALUES (DATEADD(HOUR,-122,SYSDATETIME()), N'Nguyễn Văn An', '0901000001', N'12 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội', 30000, 30000, 1, 4, (SELECT MaVoucher FROM VOUCHER WHERE MaCode='FREESHIP30'));
INSERT INTO CHI_TIET_DON_HANG (MaDH, MaBT, SoLuong, DonGia) VALUES (1, (SELECT MaBT FROM BIEN_THE WHERE SKU='AT-BASIC-TRG-M'), 2, 199000);
INSERT INTO CHI_TIET_DON_HANG (MaDH, MaBT, SoLuong, DonGia) VALUES (1, (SELECT MaBT FROM BIEN_THE WHERE SKU='QJ-SLIM-NAV-L'), 1, 459000);
INSERT INTO THANH_TOAN (SoTien, TrangThaiTT, NgayThanhToan, MaDH, MaPT) VALUES (857000, N'Chưa thanh toán', NULL, 1, 1);
INSERT INTO LICH_SU_DON_HANG (ThoiGian, GhiChu, MaDH, MaTrangThai, MaNguoiDoi) VALUES (DATEADD(HOUR,-122,SYSDATETIME()), N'Khách đặt hàng', 1, 1, NULL);
INSERT INTO LICH_SU_DON_HANG (ThoiGian, GhiChu, MaDH, MaTrangThai, MaNguoiDoi) VALUES (DATEADD(HOUR,-119,SYSDATETIME()), N'Nhân viên xác nhận', 1, 2, 3);
INSERT INTO LICH_SU_DON_HANG (ThoiGian, GhiChu, MaDH, MaTrangThai, MaNguoiDoi) VALUES (DATEADD(HOUR,-116,SYSDATETIME()), N'Đóng gói xong', 1, 3, 3);
INSERT INTO LICH_SU_DON_HANG (ThoiGian, GhiChu, MaDH, MaTrangThai, MaNguoiDoi) VALUES (DATEADD(HOUR,-113,SYSDATETIME()), N'Bàn giao cho đơn vị vận chuyển', 1, 4, 3);
INSERT INTO DON_HANG (NgayDat, TenNguoiNhan, SDTNguoiNhan, DiaChiGiao, PhiVanChuyen, TienGiam, MaTK, MaTrangThai, MaVoucher) VALUES (DATEADD(HOUR,-2,SYSDATETIME()), N'Trần Thị Bình', '0901000002', N'25 Lê Lợi, Hai Bà Trưng, Hà Nội', 30000, 0, 2, 1, NULL);
INSERT INTO CHI_TIET_DON_HANG (MaDH, MaBT, SoLuong, DonGia) VALUES (2, (SELECT MaBT FROM BIEN_THE WHERE SKU='SM-OXF-TRG-M'), 1, 359000);
INSERT INTO THANH_TOAN (SoTien, TrangThaiTT, NgayThanhToan, MaDH, MaPT) VALUES (389000, N'Chưa thanh toán', NULL, 2, 1);
INSERT INTO LICH_SU_DON_HANG (ThoiGian, GhiChu, MaDH, MaTrangThai, MaNguoiDoi) VALUES (DATEADD(HOUR,-2,SYSDATETIME()), N'Khách đặt hàng', 2, 1, NULL);
INSERT INTO DON_HANG (NgayDat, TenNguoiNhan, SDTNguoiNhan, DiaChiGiao, PhiVanChuyen, TienGiam, MaTK, MaTrangThai, MaVoucher) VALUES (DATEADD(HOUR,-146,SYSDATETIME()), N'Nguyễn Văn An', '0901000001', N'12 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội', 30000, 0, 1, 5, NULL);
INSERT INTO CHI_TIET_DON_HANG (MaDH, MaBT, SoLuong, DonGia) VALUES (3, (SELECT MaBT FROM BIEN_THE WHERE SKU='AT-BASIC-DEN-L'), 1, 199000);
INSERT INTO CHI_TIET_DON_HANG (MaDH, MaBT, SoLuong, DonGia) VALUES (3, (SELECT MaBT FROM BIEN_THE WHERE SKU='AT-POLO-TRG-M'), 1, 259000);
INSERT INTO THANH_TOAN (SoTien, TrangThaiTT, NgayThanhToan, MaDH, MaPT) VALUES (488000, N'Đã thanh toán', DATEADD(HOUR,-144,SYSDATETIME()), 3, 2);
INSERT INTO LICH_SU_DON_HANG (ThoiGian, GhiChu, MaDH, MaTrangThai, MaNguoiDoi) VALUES (DATEADD(HOUR,-146,SYSDATETIME()), N'Khách đặt hàng', 3, 1, NULL);
INSERT INTO LICH_SU_DON_HANG (ThoiGian, GhiChu, MaDH, MaTrangThai, MaNguoiDoi) VALUES (DATEADD(HOUR,-143,SYSDATETIME()), N'Nhân viên xác nhận', 3, 2, 3);
INSERT INTO LICH_SU_DON_HANG (ThoiGian, GhiChu, MaDH, MaTrangThai, MaNguoiDoi) VALUES (DATEADD(HOUR,-140,SYSDATETIME()), N'Đóng gói xong', 3, 3, 3);
INSERT INTO LICH_SU_DON_HANG (ThoiGian, GhiChu, MaDH, MaTrangThai, MaNguoiDoi) VALUES (DATEADD(HOUR,-137,SYSDATETIME()), N'Bàn giao cho đơn vị vận chuyển', 3, 4, 3);
INSERT INTO LICH_SU_DON_HANG (ThoiGian, GhiChu, MaDH, MaTrangThai, MaNguoiDoi) VALUES (DATEADD(HOUR,-134,SYSDATETIME()), N'Giao thành công', 3, 5, 3);
INSERT INTO DON_HANG (NgayDat, TenNguoiNhan, SDTNguoiNhan, DiaChiGiao, PhiVanChuyen, TienGiam, MaTK, MaTrangThai, MaVoucher) VALUES (DATEADD(HOUR,-98,SYSDATETIME()), N'Trần Thị Bình', '0901000002', N'25 Lê Lợi, Hai Bà Trưng, Hà Nội', 30000, 74800, 2, 5, (SELECT MaVoucher FROM VOUCHER WHERE MaCode='DAILY10'));
INSERT INTO CHI_TIET_DON_HANG (MaDH, MaBT, SoLuong, DonGia) VALUES (4, (SELECT MaBT FROM BIEN_THE WHERE SKU='QJ-BAGGY-DNM-L'), 1, 499000);
INSERT INTO CHI_TIET_DON_HANG (MaDH, MaBT, SoLuong, DonGia) VALUES (4, (SELECT MaBT FROM BIEN_THE WHERE SKU='PK-TL-DEN-FREE'), 1, 249000);
INSERT INTO THANH_TOAN (SoTien, TrangThaiTT, NgayThanhToan, MaDH, MaPT) VALUES (703200, N'Đã thanh toán', DATEADD(HOUR,-96,SYSDATETIME()), 4, 1);
INSERT INTO LICH_SU_DON_HANG (ThoiGian, GhiChu, MaDH, MaTrangThai, MaNguoiDoi) VALUES (DATEADD(HOUR,-98,SYSDATETIME()), N'Khách đặt hàng', 4, 1, NULL);
INSERT INTO LICH_SU_DON_HANG (ThoiGian, GhiChu, MaDH, MaTrangThai, MaNguoiDoi) VALUES (DATEADD(HOUR,-95,SYSDATETIME()), N'Nhân viên xác nhận', 4, 2, 3);
INSERT INTO LICH_SU_DON_HANG (ThoiGian, GhiChu, MaDH, MaTrangThai, MaNguoiDoi) VALUES (DATEADD(HOUR,-92,SYSDATETIME()), N'Đóng gói xong', 4, 3, 3);
INSERT INTO LICH_SU_DON_HANG (ThoiGian, GhiChu, MaDH, MaTrangThai, MaNguoiDoi) VALUES (DATEADD(HOUR,-89,SYSDATETIME()), N'Bàn giao cho đơn vị vận chuyển', 4, 4, 3);
INSERT INTO LICH_SU_DON_HANG (ThoiGian, GhiChu, MaDH, MaTrangThai, MaNguoiDoi) VALUES (DATEADD(HOUR,-86,SYSDATETIME()), N'Giao thành công', 4, 5, 3);
INSERT INTO DON_HANG (NgayDat, TenNguoiNhan, SDTNguoiNhan, DiaChiGiao, PhiVanChuyen, TienGiam, MaTK, MaTrangThai, MaVoucher) VALUES (DATEADD(HOUR,-74,SYSDATETIME()), N'Hoàng Thu Hà', '0901000005', N'88 Nguyễn Trãi, Thanh Xuân, Hà Nội', 30000, 0, 5, 5, NULL);
INSERT INTO CHI_TIET_DON_HANG (MaDH, MaBT, SoLuong, DonGia) VALUES (5, (SELECT MaBT FROM BIEN_THE WHERE SKU='SM-LINEN-BE-M'), 2, 329000);
INSERT INTO THANH_TOAN (SoTien, TrangThaiTT, NgayThanhToan, MaDH, MaPT) VALUES (688000, N'Đã thanh toán', DATEADD(HOUR,-72,SYSDATETIME()), 5, 1);
INSERT INTO LICH_SU_DON_HANG (ThoiGian, GhiChu, MaDH, MaTrangThai, MaNguoiDoi) VALUES (DATEADD(HOUR,-74,SYSDATETIME()), N'Khách đặt hàng', 5, 1, NULL);
INSERT INTO LICH_SU_DON_HANG (ThoiGian, GhiChu, MaDH, MaTrangThai, MaNguoiDoi) VALUES (DATEADD(HOUR,-71,SYSDATETIME()), N'Nhân viên xác nhận', 5, 2, 3);
INSERT INTO LICH_SU_DON_HANG (ThoiGian, GhiChu, MaDH, MaTrangThai, MaNguoiDoi) VALUES (DATEADD(HOUR,-68,SYSDATETIME()), N'Đóng gói xong', 5, 3, 3);
INSERT INTO LICH_SU_DON_HANG (ThoiGian, GhiChu, MaDH, MaTrangThai, MaNguoiDoi) VALUES (DATEADD(HOUR,-65,SYSDATETIME()), N'Bàn giao cho đơn vị vận chuyển', 5, 4, 3);
INSERT INTO LICH_SU_DON_HANG (ThoiGian, GhiChu, MaDH, MaTrangThai, MaNguoiDoi) VALUES (DATEADD(HOUR,-62,SYSDATETIME()), N'Giao thành công', 5, 5, 3);
INSERT INTO DON_HANG (NgayDat, TenNguoiNhan, SDTNguoiNhan, DiaChiGiao, PhiVanChuyen, TienGiam, MaTK, MaTrangThai, MaVoucher) VALUES (DATEADD(HOUR,-26,SYSDATETIME()), N'Vũ Đức Khánh', '0901000006', N'5 Điện Biên Phủ, Quận 1, TP. Hồ Chí Minh', 30000, 83700, 6, 5, (SELECT MaVoucher FROM VOUCHER WHERE MaCode='DAILY10'));
INSERT INTO CHI_TIET_DON_HANG (MaDH, MaBT, SoLuong, DonGia) VALUES (6, (SELECT MaBT FROM BIEN_THE WHERE SKU='QJ-STRAIGHT-DNM-L'), 1, 439000);
INSERT INTO CHI_TIET_DON_HANG (MaDH, MaBT, SoLuong, DonGia) VALUES (6, (SELECT MaBT FROM BIEN_THE WHERE SKU='AT-BASIC-XAM-L'), 2, 199000);
INSERT INTO THANH_TOAN (SoTien, TrangThaiTT, NgayThanhToan, MaDH, MaPT) VALUES (783300, N'Đã thanh toán', DATEADD(HOUR,-24,SYSDATETIME()), 6, 2);
INSERT INTO LICH_SU_DON_HANG (ThoiGian, GhiChu, MaDH, MaTrangThai, MaNguoiDoi) VALUES (DATEADD(HOUR,-26,SYSDATETIME()), N'Khách đặt hàng', 6, 1, NULL);
INSERT INTO LICH_SU_DON_HANG (ThoiGian, GhiChu, MaDH, MaTrangThai, MaNguoiDoi) VALUES (DATEADD(HOUR,-23,SYSDATETIME()), N'Nhân viên xác nhận', 6, 2, 3);
INSERT INTO LICH_SU_DON_HANG (ThoiGian, GhiChu, MaDH, MaTrangThai, MaNguoiDoi) VALUES (DATEADD(HOUR,-20,SYSDATETIME()), N'Đóng gói xong', 6, 3, 3);
INSERT INTO LICH_SU_DON_HANG (ThoiGian, GhiChu, MaDH, MaTrangThai, MaNguoiDoi) VALUES (DATEADD(HOUR,-17,SYSDATETIME()), N'Bàn giao cho đơn vị vận chuyển', 6, 4, 3);
INSERT INTO LICH_SU_DON_HANG (ThoiGian, GhiChu, MaDH, MaTrangThai, MaNguoiDoi) VALUES (DATEADD(HOUR,-14,SYSDATETIME()), N'Giao thành công', 6, 5, 3);
INSERT INTO DON_HANG (NgayDat, TenNguoiNhan, SDTNguoiNhan, DiaChiGiao, PhiVanChuyen, TienGiam, MaTK, MaTrangThai, MaVoucher) VALUES (DATEADD(HOUR,-26,SYSDATETIME()), N'Hoàng Thu Hà', '0901000005', N'88 Nguyễn Trãi, Thanh Xuân, Hà Nội', 30000, 0, 5, 3, NULL);
INSERT INTO CHI_TIET_DON_HANG (MaDH, MaBT, SoLuong, DonGia) VALUES (7, (SELECT MaBT FROM BIEN_THE WHERE SKU='PK-NON-DEN-FREE'), 2, 149000);
INSERT INTO THANH_TOAN (SoTien, TrangThaiTT, NgayThanhToan, MaDH, MaPT) VALUES (328000, N'Chưa thanh toán', NULL, 7, 2);
INSERT INTO LICH_SU_DON_HANG (ThoiGian, GhiChu, MaDH, MaTrangThai, MaNguoiDoi) VALUES (DATEADD(HOUR,-26,SYSDATETIME()), N'Khách đặt hàng', 7, 1, NULL);
INSERT INTO LICH_SU_DON_HANG (ThoiGian, GhiChu, MaDH, MaTrangThai, MaNguoiDoi) VALUES (DATEADD(HOUR,-23,SYSDATETIME()), N'Nhân viên xác nhận', 7, 2, 3);
INSERT INTO LICH_SU_DON_HANG (ThoiGian, GhiChu, MaDH, MaTrangThai, MaNguoiDoi) VALUES (DATEADD(HOUR,-20,SYSDATETIME()), N'Đóng gói xong', 7, 3, 3);
INSERT INTO DON_HANG (NgayDat, TenNguoiNhan, SDTNguoiNhan, DiaChiGiao, PhiVanChuyen, TienGiam, MaTK, MaTrangThai, MaVoucher) VALUES (DATEADD(HOUR,-2,SYSDATETIME()), N'Nguyễn Văn An', '0901000001', N'12 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội', 30000, 0, 1, 2, NULL);
INSERT INTO CHI_TIET_DON_HANG (MaDH, MaBT, SoLuong, DonGia) VALUES (8, (SELECT MaBT FROM BIEN_THE WHERE SKU='QK-ONGDUNG-DEN-M'), 1, 399000);
INSERT INTO CHI_TIET_DON_HANG (MaDH, MaBT, SoLuong, DonGia) VALUES (8, (SELECT MaBT FROM BIEN_THE WHERE SKU='PK-VI-NAU-FREE'), 1, 329000);
INSERT INTO THANH_TOAN (SoTien, TrangThaiTT, NgayThanhToan, MaDH, MaPT) VALUES (758000, N'Chưa thanh toán', NULL, 8, 1);
INSERT INTO LICH_SU_DON_HANG (ThoiGian, GhiChu, MaDH, MaTrangThai, MaNguoiDoi) VALUES (DATEADD(HOUR,-2,SYSDATETIME()), N'Khách đặt hàng', 8, 1, NULL);
INSERT INTO LICH_SU_DON_HANG (ThoiGian, GhiChu, MaDH, MaTrangThai, MaNguoiDoi) VALUES (DATEADD(HOUR,-0,SYSDATETIME()), N'Nhân viên xác nhận', 8, 2, 3);
INSERT INTO DON_HANG (NgayDat, TenNguoiNhan, SDTNguoiNhan, DiaChiGiao, PhiVanChuyen, TienGiam, MaTK, MaTrangThai, MaVoucher) VALUES (DATEADD(HOUR,-50,SYSDATETIME()), N'Vũ Đức Khánh', '0901000006', N'5 Điện Biên Phủ, Quận 1, TP. Hồ Chí Minh', 30000, 0, 6, 6, NULL);
INSERT INTO CHI_TIET_DON_HANG (MaDH, MaBT, SoLuong, DonGia) VALUES (9, (SELECT MaBT FROM BIEN_THE WHERE SKU='SM-FLAN-NAU-M'), 1, 389000);
INSERT INTO THANH_TOAN (SoTien, TrangThaiTT, NgayThanhToan, MaDH, MaPT) VALUES (419000, N'Chưa thanh toán', NULL, 9, 1);
INSERT INTO LICH_SU_DON_HANG (ThoiGian, GhiChu, MaDH, MaTrangThai, MaNguoiDoi) VALUES (DATEADD(HOUR,-50,SYSDATETIME()), N'Khách đặt hàng', 9, 1, NULL);
INSERT INTO LICH_SU_DON_HANG (ThoiGian, GhiChu, MaDH, MaTrangThai, MaNguoiDoi) VALUES (DATEADD(HOUR,-47,SYSDATETIME()), N'Khách hủy đơn', 9, 6, 3);
INSERT INTO DON_HANG (NgayDat, TenNguoiNhan, SDTNguoiNhan, DiaChiGiao, PhiVanChuyen, TienGiam, MaTK, MaTrangThai, MaVoucher) VALUES (DATEADD(HOUR,-50,SYSDATETIME()), N'Trần Thị Bình', '0901000002', N'25 Lê Lợi, Hai Bà Trưng, Hà Nội', 30000, 30000, 2, 5, (SELECT MaVoucher FROM VOUCHER WHERE MaCode='FREESHIP30'));
INSERT INTO CHI_TIET_DON_HANG (MaDH, MaBT, SoLuong, DonGia) VALUES (10, (SELECT MaBT FROM BIEN_THE WHERE SKU='AT-POLO-NAV-M'), 1, 259000);
INSERT INTO CHI_TIET_DON_HANG (MaDH, MaBT, SoLuong, DonGia) VALUES (10, (SELECT MaBT FROM BIEN_THE WHERE SKU='QK-ONGDUNG-BE-L'), 1, 399000);
INSERT INTO THANH_TOAN (SoTien, TrangThaiTT, NgayThanhToan, MaDH, MaPT) VALUES (658000, N'Đã thanh toán', DATEADD(HOUR,-48,SYSDATETIME()), 10, 1);
INSERT INTO LICH_SU_DON_HANG (ThoiGian, GhiChu, MaDH, MaTrangThai, MaNguoiDoi) VALUES (DATEADD(HOUR,-50,SYSDATETIME()), N'Khách đặt hàng', 10, 1, NULL);
INSERT INTO LICH_SU_DON_HANG (ThoiGian, GhiChu, MaDH, MaTrangThai, MaNguoiDoi) VALUES (DATEADD(HOUR,-47,SYSDATETIME()), N'Nhân viên xác nhận', 10, 2, 3);
INSERT INTO LICH_SU_DON_HANG (ThoiGian, GhiChu, MaDH, MaTrangThai, MaNguoiDoi) VALUES (DATEADD(HOUR,-44,SYSDATETIME()), N'Đóng gói xong', 10, 3, 3);
INSERT INTO LICH_SU_DON_HANG (ThoiGian, GhiChu, MaDH, MaTrangThai, MaNguoiDoi) VALUES (DATEADD(HOUR,-41,SYSDATETIME()), N'Bàn giao cho đơn vị vận chuyển', 10, 4, 3);
INSERT INTO LICH_SU_DON_HANG (ThoiGian, GhiChu, MaDH, MaTrangThai, MaNguoiDoi) VALUES (DATEADD(HOUR,-38,SYSDATETIME()), N'Giao thành công', 10, 5, 3);
UPDATE VI_VOUCHER SET DaSuDung=1 WHERE MaTK=1 AND MaVoucher=(SELECT MaVoucher FROM VOUCHER WHERE MaCode='FREESHIP30');
UPDATE VI_VOUCHER SET DaSuDung=1 WHERE MaTK=2 AND MaVoucher=(SELECT MaVoucher FROM VOUCHER WHERE MaCode='DAILY10');
UPDATE VI_VOUCHER SET DaSuDung=1 WHERE MaTK=6 AND MaVoucher=(SELECT MaVoucher FROM VOUCHER WHERE MaCode='DAILY10');
UPDATE VI_VOUCHER SET DaSuDung=1 WHERE MaTK=2 AND MaVoucher=(SELECT MaVoucher FROM VOUCHER WHERE MaCode='FREESHIP30');
INSERT INTO DANH_GIA (SoSao, NoiDung, MaTK, MaSP) VALUES
(5, N'Vải mát, mặc vừa vặn', 1, 1),
(4, N'Form đẹp, giao nhanh', 1, 5),
(5, N'Denim dày dặn, rất đáng tiền', 2, 10),
(4, N'Linen mát, hơi nhăn nhẹ', 5, 8),
(5, N'Quần đẹp, đúng size', 6, 11),
(3, N'Áo ổn nhưng màu hơi khác ảnh', 6, 1);
GO

-- =====================================================================
-- VIEW: TỔNG TIỀN ĐƠN HÀNG (thuộc tính suy diễn, không lưu trong bảng)
-- =====================================================================
CREATE VIEW vw_TongTienDonHang AS
SELECT  dh.MaDH,
        SUM(ct.SoLuong * ct.DonGia)                                   AS TienHang,
        dh.PhiVanChuyen,
        dh.TienGiam,
        SUM(ct.SoLuong * ct.DonGia) + dh.PhiVanChuyen - dh.TienGiam   AS TongThanhToan
FROM    DON_HANG dh
JOIN    CHI_TIET_DON_HANG ct ON ct.MaDH = dh.MaDH
GROUP BY dh.MaDH, dh.PhiVanChuyen, dh.TienGiam;
GO