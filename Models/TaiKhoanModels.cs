using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DailyMan.Models;

// Mỗi class = 1 bảng trong CSDL (giữ nguyên tên bảng/cột như thiết kế ở báo cáo Sprint 1)

[Table("VAI_TRO")]
public class VaiTro
{
    [Key] public int MaVaiTro { get; set; }
    [Required, StringLength(30)] public string TenVaiTro { get; set; } = "";   // Customer | Staff | Admin
}

[Table("HANG_THANH_VIEN")]
public class HangThanhVien
{
    [Key] public int MaHang { get; set; }
    [Required, StringLength(30)] public string TenHang { get; set; } = "";
    [Column(TypeName = "decimal(12,0)")] public decimal ChiTieuToiThieu { get; set; }
    public int PhanTramUuDai { get; set; }
}

[Table("TAI_KHOAN")]
public class TaiKhoan
{
    [Key] public int MaTK { get; set; }
    [Required, StringLength(100)] public string HoTen { get; set; } = "";
    [Required, StringLength(100)] public string Email { get; set; } = "";
    [Required, StringLength(255)] public string MatKhauHash { get; set; } = "";
    [Required, StringLength(15)] public string SoDienThoai { get; set; } = "";
    [StringLength(20)] public string TrangThai { get; set; } = Const.TK_HOAT_DONG;
    public int SoLanDangNhapSai { get; set; }
    public DateTime? KhoaDen { get; set; }
    public DateTime NgayTao { get; set; } = DateTime.Now;

    public int MaVaiTro { get; set; }
    public VaiTro? VaiTro { get; set; }
    public int? MaHang { get; set; }                 // chỉ áp dụng cho Customer
    public HangThanhVien? HangThanhVien { get; set; }
}

[Table("DIA_CHI")]
public class DiaChi
{
    [Key] public int MaDC { get; set; }
    public int MaTK { get; set; }
    [Required, StringLength(100)] public string TenNguoiNhan { get; set; } = "";
    [Required, StringLength(15)] public string SDT { get; set; } = "";
    [Required, StringLength(50)] public string TinhThanh { get; set; } = "";
    [Required, StringLength(50)] public string QuanHuyen { get; set; } = "";
    [Required, StringLength(150)] public string DiaChiCuThe { get; set; } = "";
    public bool MacDinh { get; set; }
    public DateTime NgayTao { get; set; } = DateTime.Now;

    public string DayDu => $"{DiaChiCuThe}, {QuanHuyen}, {TinhThanh}";
}
