using System.ComponentModel.DataAnnotations;

namespace DailyMan.ViewModels;

public class LoginVm
{
    [Required(ErrorMessage = "Vui lòng nhập email hoặc số điện thoại")] public string TaiKhoan { get; set; } = "";
    [Required(ErrorMessage = "Vui lòng nhập mật khẩu")] public string MatKhau { get; set; } = "";
    public bool GhiNho { get; set; }
    public string? ReturnUrl { get; set; }
}

public class RegisterVm
{
    [Required(ErrorMessage = "Vui lòng nhập họ tên"), StringLength(100)] public string HoTen { get; set; } = "";
    [Required(ErrorMessage = "Vui lòng nhập email"), EmailAddress(ErrorMessage = "Email không hợp lệ"), StringLength(100)] public string Email { get; set; } = "";
    [Required(ErrorMessage = "Vui lòng nhập số điện thoại"), RegularExpression(@"^0\d{9,10}$", ErrorMessage = "Số điện thoại gồm 10–11 chữ số, bắt đầu bằng 0")] public string SoDienThoai { get; set; } = "";
    [Required(ErrorMessage = "Vui lòng nhập mật khẩu"), MinLength(6, ErrorMessage = "Mật khẩu tối thiểu 6 ký tự")] public string MatKhau { get; set; } = "";
    [Compare(nameof(MatKhau), ErrorMessage = "Mật khẩu nhập lại không khớp")] public string NhapLai { get; set; } = "";
}

public class ProfileVm
{
    [Required(ErrorMessage = "Vui lòng nhập họ tên"), StringLength(100)] public string HoTen { get; set; } = "";
    [Required(ErrorMessage = "Vui lòng nhập số điện thoại"), RegularExpression(@"^0\d{9,10}$", ErrorMessage = "Số điện thoại gồm 10–11 chữ số, bắt đầu bằng 0")] public string SoDienThoai { get; set; } = "";
}

public class ChangePasswordVm
{
    [Required(ErrorMessage = "Vui lòng nhập mật khẩu hiện tại")] public string MatKhauCu { get; set; } = "";
    [Required(ErrorMessage = "Vui lòng nhập mật khẩu mới"), MinLength(6, ErrorMessage = "Mật khẩu mới tối thiểu 6 ký tự")] public string MatKhauMoi { get; set; } = "";
    [Compare(nameof(MatKhauMoi), ErrorMessage = "Mật khẩu nhập lại không khớp")] public string NhapLai { get; set; } = "";
}

public class AddressVm
{
    public int MaDC { get; set; }
    [Required(ErrorMessage = "Nhập tên người nhận"), StringLength(100)] public string TenNguoiNhan { get; set; } = "";
    [Required(ErrorMessage = "Nhập số điện thoại"), RegularExpression(@"^0\d{9,10}$", ErrorMessage = "Số điện thoại không hợp lệ")] public string SDT { get; set; } = "";
    [Required(ErrorMessage = "Nhập tỉnh / thành phố"), StringLength(50)] public string TinhThanh { get; set; } = "";
    [Required(ErrorMessage = "Nhập quận / huyện"), StringLength(50)] public string QuanHuyen { get; set; } = "";
    [Required(ErrorMessage = "Nhập địa chỉ cụ thể"), StringLength(150)] public string DiaChiCuThe { get; set; } = "";
    public bool MacDinh { get; set; }
}
