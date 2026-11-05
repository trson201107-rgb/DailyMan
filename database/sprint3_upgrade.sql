-- =====================================================================
-- NÂNG CẤP CSDL TỪ SPRINT 2 LÊN SPRINT 3 (giữ nguyên dữ liệu đang có)
-- Chạy file này trên database ThoiTrangNam đã có (SSMS: chọn đúng database rồi Execute).
-- Chạy lại nhiều lần không lỗi.
-- =====================================================================
-- =====================================================================
-- SPRINT 3: MỞ RỘNG CSDL (chạy lại nhiều lần không lỗi)
--   Cột mới : SAN_PHAM.GiaGoc, DON_HANG.UuDaiHang, CHI_TIET_GIO_HANG.GiaLucThem
--   Bảng mới: ANH_SAN_PHAM, DIA_CHI, DAT_LAI_MAT_KHAU, YEU_CAU_DOI_TRA, LS_TON_KHO, CAU_HINH
-- =====================================================================
IF COL_LENGTH('SAN_PHAM', 'GiaGoc') IS NULL
    ALTER TABLE SAN_PHAM ADD GiaGoc DECIMAL(12,0) NULL;              -- giá niêm yết trước giảm (hiển thị gạch ngang + % giảm)
GO
IF OBJECT_ID('CK_SP_GiaGoc', 'C') IS NULL
    ALTER TABLE SAN_PHAM ADD CONSTRAINT CK_SP_GiaGoc CHECK (GiaGoc IS NULL OR GiaGoc >= GiaBan);
GO
IF COL_LENGTH('DON_HANG', 'UuDaiHang') IS NULL
    ALTER TABLE DON_HANG ADD UuDaiHang DECIMAL(12,0) NOT NULL CONSTRAINT DF_DH_UuDaiHang DEFAULT 0;   -- phần ưu đãi hạng thành viên (đã nằm trong TienGiam)
GO
IF COL_LENGTH('CHI_TIET_GIO_HANG', 'GiaLucThem') IS NULL
    ALTER TABLE CHI_TIET_GIO_HANG ADD GiaLucThem DECIMAL(12,0) NULL;  -- giá lúc khách thêm vào giỏ, dùng để báo khi giá thay đổi
GO

IF OBJECT_ID('CAU_HINH', 'U') IS NULL
CREATE TABLE CAU_HINH (
    Khoa    NVARCHAR(50)  NOT NULL,
    GiaTri  NVARCHAR(200) NOT NULL,
    CONSTRAINT PK_CAU_HINH PRIMARY KEY (Khoa)
);
GO

IF OBJECT_ID('ANH_SAN_PHAM', 'U') IS NULL
CREATE TABLE ANH_SAN_PHAM (
    MaAnh     INT IDENTITY(1,1) NOT NULL,
    MaSP      INT               NOT NULL,
    DuongDan  NVARCHAR(255)     NULL,         -- ảnh dạng URL
    DuLieu    VARBINARY(MAX)    NULL,         -- hoặc ảnh tải lên (lưu trong DB để không mất khi deploy)
    LoaiAnh   VARCHAR(30)       NULL,
    ThuTu     INT               NOT NULL CONSTRAINT DF_ANH_ThuTu DEFAULT 0,
    NgayTao   DATETIME2         NOT NULL CONSTRAINT DF_ANH_NgayTao DEFAULT SYSDATETIME(),
    CONSTRAINT PK_ANH_SP PRIMARY KEY (MaAnh),
    CONSTRAINT FK_ANH_SP FOREIGN KEY (MaSP) REFERENCES SAN_PHAM(MaSP) ON DELETE CASCADE,
    CONSTRAINT CK_ANH_Nguon CHECK (DuongDan IS NOT NULL OR DuLieu IS NOT NULL)
);
GO

IF OBJECT_ID('DIA_CHI', 'U') IS NULL
CREATE TABLE DIA_CHI (
    MaDC          INT IDENTITY(1,1) NOT NULL,
    MaTK          INT               NOT NULL,
    TenNguoiNhan  NVARCHAR(100)     NOT NULL,
    SDT           VARCHAR(15)       NOT NULL,
    TinhThanh     NVARCHAR(50)      NOT NULL,
    QuanHuyen     NVARCHAR(50)      NOT NULL,
    DiaChiCuThe   NVARCHAR(150)     NOT NULL,
    MacDinh       BIT               NOT NULL CONSTRAINT DF_DC_MacDinh DEFAULT 0,
    NgayTao       DATETIME2         NOT NULL CONSTRAINT DF_DC_NgayTao DEFAULT SYSDATETIME(),
    CONSTRAINT PK_DIA_CHI PRIMARY KEY (MaDC),
    CONSTRAINT FK_DC_TK FOREIGN KEY (MaTK) REFERENCES TAI_KHOAN(MaTK) ON DELETE CASCADE
);
GO

IF OBJECT_ID('DAT_LAI_MAT_KHAU', 'U') IS NULL
CREATE TABLE DAT_LAI_MAT_KHAU (
    MaDL       INT IDENTITY(1,1) NOT NULL,
    MaTK       INT               NOT NULL,
    TokenHash  CHAR(64)          NOT NULL,    -- SHA-256 của token (token gốc chỉ nằm trong email)
    HetHan     DATETIME2         NOT NULL,
    DaDung     BIT               NOT NULL CONSTRAINT DF_DL_DaDung DEFAULT 0,
    NgayTao    DATETIME2         NOT NULL CONSTRAINT DF_DL_NgayTao DEFAULT SYSDATETIME(),
    CONSTRAINT PK_DAT_LAI_MK PRIMARY KEY (MaDL),
    CONSTRAINT UQ_DL_Token UNIQUE (TokenHash),
    CONSTRAINT FK_DL_TK FOREIGN KEY (MaTK) REFERENCES TAI_KHOAN(MaTK) ON DELETE CASCADE
);
GO

IF OBJECT_ID('YEU_CAU_DOI_TRA', 'U') IS NULL
CREATE TABLE YEU_CAU_DOI_TRA (
    MaYC           INT IDENTITY(1,1) NOT NULL,
    MaDH           INT               NOT NULL,
    MaTK           INT               NOT NULL,
    LyDo           NVARCHAR(500)     NOT NULL,
    TrangThai      NVARCHAR(20)      NOT NULL CONSTRAINT DF_YC_TrangThai DEFAULT N'Chờ xử lý',
    LyDoTuChoi     NVARCHAR(500)     NULL,
    NgayTao        DATETIME2         NOT NULL CONSTRAINT DF_YC_NgayTao DEFAULT SYSDATETIME(),
    NgayXuLy       DATETIME2         NULL,
    MaNguoiXuLy    INT               NULL,
    CONSTRAINT PK_YEU_CAU_DOI_TRA PRIMARY KEY (MaYC),
    CONSTRAINT CK_YC_TrangThai CHECK (TrangThai IN (N'Chờ xử lý', N'Đã chấp nhận', N'Từ chối')),
    CONSTRAINT FK_YC_DH  FOREIGN KEY (MaDH)        REFERENCES DON_HANG(MaDH),
    CONSTRAINT FK_YC_TK  FOREIGN KEY (MaTK)        REFERENCES TAI_KHOAN(MaTK),
    CONSTRAINT FK_YC_NV  FOREIGN KEY (MaNguoiXuLy) REFERENCES TAI_KHOAN(MaTK)
);
GO

IF OBJECT_ID('LS_TON_KHO', 'U') IS NULL
CREATE TABLE LS_TON_KHO (
    MaLSTK           INT IDENTITY(1,1) NOT NULL,
    MaBT             INT               NOT NULL,
    LoaiThaoTac      NVARCHAR(20)      NOT NULL,   -- Nhập hàng / Điều chỉnh / Kiểm kê / Bán hàng / Hoàn kho
    SoLuongThayDoi   INT               NOT NULL,
    TonSau           INT               NOT NULL,
    GhiChu           NVARCHAR(255)     NULL,
    MaNguoiThucHien  INT               NULL,
    ThoiGian         DATETIME2         NOT NULL CONSTRAINT DF_LSTK_ThoiGian DEFAULT SYSDATETIME(),
    CONSTRAINT PK_LS_TON_KHO PRIMARY KEY (MaLSTK),
    CONSTRAINT FK_LSTK_BT FOREIGN KEY (MaBT) REFERENCES BIEN_THE(MaBT) ON DELETE CASCADE,
    CONSTRAINT FK_LSTK_NV FOREIGN KEY (MaNguoiThucHien) REFERENCES TAI_KHOAN(MaTK)
);
GO
-- Dữ liệu bắt buộc của Sprint 3 (không trùng lặp khi chạy lại)
IF NOT EXISTS (SELECT 1 FROM TRANG_THAI_DON WHERE TenTrangThai = N'Đổi trả')
    INSERT INTO TRANG_THAI_DON (TenTrangThai) VALUES (N'Đổi trả');
IF NOT EXISTS (SELECT 1 FROM CAU_HINH WHERE Khoa = N'UU_DAI_HANG')
    INSERT INTO CAU_HINH (Khoa, GiaTri) VALUES (N'UU_DAI_HANG', N'0');     -- 1 = áp dụng ưu đãi hạng thành viên khi thanh toán
GO
