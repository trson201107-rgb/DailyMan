using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DailyMan.Models;

/// <summary>
/// Mã giảm giá. Có 3 loại (theo yêu cầu của thầy):
///   SuKien : giảm theo sự kiện / dịp lễ (có thời gian diễn ra)
///   Combo  : giảm khi mua đủ combo (vd 2 áo thun, hoặc 1 áo + 1 quần)
///   CapBac : giảm theo cấp bậc tài khoản (chỉ từ hạng X trở lên mới dùng được)
/// </summary>
[Table("VOUCHER")]
public class Voucher
{
    [Key] public int MaVoucher { get; set; }
    [Required, StringLength(30)] public string MaCode { get; set; } = "";
    [Required, StringLength(100)] public string TenChuongTrinh { get; set; } = "";
    [StringLength(10)] public string LoaiKM { get; set; } = Const.KM_SU_KIEN;
    [StringLength(10)] public string LoaiGiam { get; set; } = Const.GIAM_PHAN_TRAM;   // PHAN_TRAM | TIEN
    [Column(TypeName = "decimal(12,0)")] public decimal GiaTriGiam { get; set; }
    [Column(TypeName = "decimal(12,0)")] public decimal? GiamToiDa { get; set; }       // trần giảm khi giảm theo %
    [Column(TypeName = "decimal(12,0)")] public decimal DonToiThieu { get; set; }
    public int SoLuotConLai { get; set; }
    public DateTime NgayBatDau { get; set; }
    public DateTime NgayHetHan { get; set; }
    public bool DangBat { get; set; } = true;                                          // nhân viên/quản trị có thể tạm tắt mã

    // --- chỉ dùng cho loại Combo ---
    public int? MaDM1 { get; set; }            // nhóm 1: danh mục cần mua (null = bất kỳ)
    public int? SoLuong1 { get; set; }         // số sản phẩm tối thiểu của nhóm 1
    public int? MaDM2 { get; set; }            // nhóm 2 (không bắt buộc), vd "áo + quần"
    public int? SoLuong2 { get; set; }
    // --- chỉ dùng cho loại CapBac ---
    public int? MaHangToiThieu { get; set; }   // hạng thấp nhất được dùng mã

    [NotMapped]
    public string TinhTrang =>
        !DangBat ? "Đang tắt" :
        NgayHetHan.Date < DateTime.Today ? "Hết hạn" :
        SoLuotConLai <= 0 ? "Hết lượt" :
        NgayBatDau.Date > DateTime.Today ? "Chưa bắt đầu" : "Đang chạy";
}

[Table("CAU_HINH")]
public class CauHinh
{
    [Key, StringLength(50)] public string Khoa { get; set; } = "";
    [Required, StringLength(200)] public string GiaTri { get; set; } = "";
}
