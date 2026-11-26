using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DailyMan.Models;

[Table("DANH_MUC")]
public class DanhMuc
{
    [Key] public int MaDM { get; set; }
    [Required(ErrorMessage = "Tên danh mục không được để trống"), StringLength(50)] public string TenDM { get; set; } = "";
    [StringLength(255)] public string? MoTa { get; set; }
    public ICollection<SanPham> SanPhams { get; set; } = new List<SanPham>();
}

[Table("SAN_PHAM")]
public class SanPham
{
    [Key] public int MaSP { get; set; }
    [Required, StringLength(150)] public string TenSP { get; set; } = "";
    [StringLength(1000)] public string? MoTa { get; set; }
    [Column(TypeName = "decimal(12,0)")] public decimal GiaBan { get; set; }
    [Column(TypeName = "decimal(12,0)")] public decimal? GiaGoc { get; set; }      // giá gốc (gạch ngang) khi đang giảm
    [StringLength(255)] public string? AnhDaiDien { get; set; }
    [StringLength(20)] public string TrangThai { get; set; } = Const.SP_BAN;
    public DateTime NgayTao { get; set; } = DateTime.Now;
    public DateTime? NgayCapNhat { get; set; }
    public int? NguoiTao { get; set; }
    public int? NguoiCapNhat { get; set; }
    public int LuotXem { get; set; }

    public int MaDM { get; set; }
    public DanhMuc? DanhMuc { get; set; }
    public ICollection<BienThe> BienThes { get; set; } = new List<BienThe>();
    public ICollection<AnhSanPham> Anhs { get; set; } = new List<AnhSanPham>();
    public ICollection<DanhGia> DanhGias { get; set; } = new List<DanhGia>();

    [NotMapped] public int TongTon => BienThes.Sum(b => b.SoLuongTon);
    [NotMapped] public int PhanTramGiam => GiaGoc.HasValue && GiaGoc > GiaBan ? (int)Math.Round((double)((GiaGoc.Value - GiaBan) * 100 / GiaGoc.Value)) : 0;
    [NotMapped] public bool LaMoi => NgayTao >= DateTime.Now.AddDays(-Const.NEW_DAYS);
    [NotMapped] public bool LaHot => LuotXem >= Const.HOT_MIN_VIEWS;
}

[Table("MAU_SAC")]
public class MauSac
{
    [Key] public int MaMau { get; set; }
    [Required, StringLength(30)] public string TenMau { get; set; } = "";
    [StringLength(9)] public string MaHex { get; set; } = "#CCCCCC";
}

[Table("KICH_CO")]
public class KichCo
{
    [Key] public int MaSize { get; set; }
    [Required, StringLength(10)] public string TenSize { get; set; } = "";
    public int ThuTu { get; set; }
}

[Table("BIEN_THE")]
public class BienThe
{
    [Key] public int MaBT { get; set; }
    [Required, StringLength(40)] public string SKU { get; set; } = "";
    public int SoLuongTon { get; set; }
    public int MaSP { get; set; }
    public SanPham? SanPham { get; set; }
    public int MaMau { get; set; }
    public MauSac? MauSac { get; set; }
    public int MaSize { get; set; }
    public KichCo? KichCo { get; set; }
    [Timestamp] public byte[]? RowVersion { get; set; }   // chống 2 người cùng mua món cuối cùng (xung đột đồng thời)
}

[Table("ANH_SAN_PHAM")]
public class AnhSanPham
{
    [Key] public int MaAnh { get; set; }
    public int MaSP { get; set; }
    [StringLength(255)] public string DuongDan { get; set; } = "";
    public int ThuTu { get; set; }
    public int? MaMau { get; set; }       // ảnh của màu nào (null = ảnh chung); chọn màu ở trang sản phẩm sẽ đổi sang ảnh màu đó
}

[Table("DANH_GIA")]
public class DanhGia
{
    [Key] public int MaDG { get; set; }
    [Range(1, 5)] public int SoSao { get; set; }
    [StringLength(500)] public string? NoiDung { get; set; }
    public DateTime NgayDG { get; set; } = DateTime.Now;
    public int MaTK { get; set; }
    public TaiKhoan? TaiKhoan { get; set; }
    public int MaSP { get; set; }
}

[Table("LS_TON_KHO")]
public class LsTonKho
{
    [Key] public int MaLSTK { get; set; }
    public int MaBT { get; set; }
    public BienThe? BienThe { get; set; }
    [StringLength(20)] public string LoaiThaoTac { get; set; } = "";   // Nhập hàng / Điều chỉnh / Kiểm kê / Bán hàng / Hoàn kho
    public int SoLuongThayDoi { get; set; }
    public int TonSau { get; set; }
    [StringLength(255)] public string? GhiChu { get; set; }
    public int? MaNguoiThucHien { get; set; }
    public DateTime ThoiGian { get; set; } = DateTime.Now;
}
