using System.ComponentModel.DataAnnotations;

namespace DailyMan.ViewModels;

public class ProductFormVm
{
    public int MaSP { get; set; }
    [Required(ErrorMessage = "Nhập tên sản phẩm"), StringLength(150)] public string TenSP { get; set; } = "";
    [Range(1, 100000000, ErrorMessage = "Giá bán phải lớn hơn 0")] public decimal GiaBan { get; set; }
    [Range(0, 100000000, ErrorMessage = "Giá gốc không hợp lệ")] public decimal? GiaGoc { get; set; }
    [Required(ErrorMessage = "Chọn danh mục")] public int MaDM { get; set; }
    [StringLength(1000)] public string? MoTa { get; set; }
    public string TrangThai { get; set; } = Models.Const.SP_BAN;
}

public class VoucherFormVm
{
    public int MaVoucher { get; set; }
    public string LoaiKM { get; set; } = Models.Const.KM_SU_KIEN;
    [Required(ErrorMessage = "Nhập mã giảm giá"), StringLength(30, MinimumLength = 3, ErrorMessage = "Mã dài 3–30 ký tự")] public string MaCode { get; set; } = "";
    [Required(ErrorMessage = "Nhập tên chương trình"), StringLength(100)] public string TenChuongTrinh { get; set; } = "";
    public string LoaiGiam { get; set; } = Models.Const.GIAM_PHAN_TRAM;
    [Range(1, 100000000, ErrorMessage = "Giá trị giảm phải lớn hơn 0")] public decimal GiaTriGiam { get; set; }
    [Range(0, 100000000)] public decimal? GiamToiDa { get; set; }
    [Range(0, 100000000, ErrorMessage = "Đơn tối thiểu không hợp lệ")] public decimal DonToiThieu { get; set; }
    [Range(0, 1000000, ErrorMessage = "Số lượt không hợp lệ")] public int SoLuotConLai { get; set; } = 100;
    [DataType(DataType.Date)] public DateTime NgayBatDau { get; set; } = DateTime.Today;
    [DataType(DataType.Date)] public DateTime NgayHetHan { get; set; } = DateTime.Today.AddMonths(1);
    public bool DangBat { get; set; } = true;
    public int? MaDM1 { get; set; }
    [Range(0, 100)] public int? SoLuong1 { get; set; }
    public int? MaDM2 { get; set; }
    [Range(0, 100)] public int? SoLuong2 { get; set; }
    public int? MaHangToiThieu { get; set; }
    public bool DaDung { get; set; }       // đã có đơn dùng mã => không cho đổi mã
}

public class AccountFormVm
{
    public int MaTK { get; set; }
    [Required(ErrorMessage = "Nhập họ tên"), StringLength(100)] public string HoTen { get; set; } = "";
    [Required(ErrorMessage = "Nhập email"), EmailAddress(ErrorMessage = "Email không hợp lệ"), StringLength(100)] public string Email { get; set; } = "";
    [Required(ErrorMessage = "Nhập số điện thoại"), RegularExpression(@"^0\d{9,10}$", ErrorMessage = "Số điện thoại gồm 10–11 chữ số, bắt đầu bằng 0")] public string SoDienThoai { get; set; } = "";
    [MinLength(6, ErrorMessage = "Mật khẩu tối thiểu 6 ký tự")] public string? MatKhau { get; set; }
    public string Role { get; set; } = Models.Const.ROLE_STAFF;
}
