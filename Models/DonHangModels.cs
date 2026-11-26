using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DailyMan.Models;

[Table("GIO_HANG")]
public class GioHang
{
    [Key] public int MaGH { get; set; }
    public DateTime NgayCapNhat { get; set; } = DateTime.Now;
    public int MaTK { get; set; }
    public ICollection<ChiTietGioHang> Dongs { get; set; } = new List<ChiTietGioHang>();
}

[Table("CHI_TIET_GIO_HANG")]
public class ChiTietGioHang
{
    public int MaGH { get; set; }
    public int MaBT { get; set; }
    public BienThe? BienThe { get; set; }
    public int SoLuong { get; set; } = 1;
    [Column(TypeName = "decimal(12,0)")] public decimal? GiaLucThem { get; set; }   // giá lúc thêm vào giỏ, để báo khi giá thay đổi
}

[Table("TRANG_THAI_DON")]
public class TrangThaiDon
{
    [Key] public int MaTrangThai { get; set; }
    [Required, StringLength(30)] public string TenTrangThai { get; set; } = "";
}

[Table("PHUONG_THUC_THANH_TOAN")]
public class PhuongThucThanhToan
{
    [Key] public int MaPT { get; set; }
    [Required, StringLength(30)] public string TenPT { get; set; } = "";
}

[Table("DON_HANG")]
public class DonHang
{
    [Key] public int MaDH { get; set; }
    public DateTime NgayDat { get; set; } = DateTime.Now;
    [Required, StringLength(100)] public string TenNguoiNhan { get; set; } = "";
    [Required, StringLength(15)] public string SDTNguoiNhan { get; set; } = "";
    [Required, StringLength(255)] public string DiaChiGiao { get; set; } = "";
    [Column(TypeName = "decimal(12,0)")] public decimal PhiVanChuyen { get; set; }
    [Column(TypeName = "decimal(12,0)")] public decimal TienGiam { get; set; }       // tổng giảm = ưu đãi hạng + mã giảm giá
    [Column(TypeName = "decimal(12,0)")] public decimal UuDaiHang { get; set; }      // phần giảm do hạng thành viên
    [StringLength(255)] public string? GhiChu { get; set; }
    [StringLength(50)] public string? LyDoHuy { get; set; }                          // chỉ có khi đơn Đã hủy (dùng cho thống kê)

    public int MaTK { get; set; }
    public TaiKhoan? TaiKhoan { get; set; }
    public int MaTrangThai { get; set; }
    public TrangThaiDon? TrangThai { get; set; }
    public int? MaVoucher { get; set; }              // mỗi đơn áp dụng tối đa 1 mã
    public Voucher? Voucher { get; set; }

    public ThanhToan? ThanhToan { get; set; }
    public ICollection<ChiTietDonHang> ChiTiets { get; set; } = new List<ChiTietDonHang>();
    public ICollection<LichSuDonHang> LichSus { get; set; } = new List<LichSuDonHang>();

    [NotMapped] public decimal TienHang => ChiTiets.Sum(c => c.SoLuong * c.DonGia);
    [NotMapped] public decimal TongThanhToan => TienHang + PhiVanChuyen - TienGiam;
}

[Table("CHI_TIET_DON_HANG")]
public class ChiTietDonHang
{
    public int MaDH { get; set; }
    public int MaBT { get; set; }
    public BienThe? BienThe { get; set; }
    public int SoLuong { get; set; }
    [Column(TypeName = "decimal(12,0)")] public decimal DonGia { get; set; }
}

[Table("THANH_TOAN")]
public class ThanhToan
{
    [Key] public int MaTT { get; set; }
    [Column(TypeName = "decimal(12,0)")] public decimal SoTien { get; set; }
    [StringLength(20)] public string TrangThaiTT { get; set; } = "Chưa thanh toán";
    public DateTime? NgayThanhToan { get; set; }
    public int MaDH { get; set; }
    public int MaPT { get; set; }
    public PhuongThucThanhToan? PhuongThuc { get; set; }
}

[Table("LICH_SU_DON_HANG")]
public class LichSuDonHang
{
    [Key] public int MaLS { get; set; }
    public DateTime ThoiGian { get; set; } = DateTime.Now;
    [StringLength(255)] public string? GhiChu { get; set; }
    public int MaDH { get; set; }
    public int MaTrangThai { get; set; }
    public TrangThaiDon? TrangThai { get; set; }
    public int? MaNguoiDoi { get; set; }             // null nếu do khách / hệ thống
    [ForeignKey("MaNguoiDoi")] public TaiKhoan? NguoiDoi { get; set; }
}

[Table("YEU_CAU_DOI_TRA")]
public class YeuCauDoiTra
{
    [Key] public int MaYC { get; set; }
    public int MaDH { get; set; }
    public DonHang? DonHang { get; set; }
    public int MaTK { get; set; }
    [StringLength(50)] public string NhomLyDo { get; set; } = "";    // lý do chọn sẵn (dùng thống kê)
    [Required, StringLength(500)] public string LyDo { get; set; } = "";
    [StringLength(20)] public string TrangThai { get; set; } = Const.DT_CHO;
    [StringLength(500)] public string? LyDoTuChoi { get; set; }
    public DateTime NgayTao { get; set; } = DateTime.Now;
    public DateTime? NgayXuLy { get; set; }
    public int? MaNguoiXuLy { get; set; }
}
