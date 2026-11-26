using DailyMan.Models;

namespace DailyMan.ViewModels;

/// <summary>Một điểm dữ liệu của biểu đồ (nhãn + giá trị, có thể kèm mã màu).</summary>
public record ChartPoint(string Label, decimal Value, string? Hex = null, string? Sub = null);

public class DateRange
{
    public DateTime From { get; init; }
    public DateTime ToExclusive { get; init; }
    public DateTime To => ToExclusive.AddDays(-1);
    public int Days => (int)(ToExclusive - From).TotalDays;
    public string Preset { get; init; } = "";
}

public class TonKhoVm
{
    public int TongSanPham { get; set; }
    public int TongTon { get; set; }
    public decimal GiaTriTon { get; set; }
    public int BienTheHet { get; set; }
    public int BienTheSap { get; set; }
    public List<ChartPoint> TheoDanhMuc { get; set; } = new();
    public List<ChartPoint> GiaTriDanhMuc { get; set; } = new();
    public List<(SanPham SP, int Ton)> SanPhamSapHet { get; set; } = new();
    public List<(SanPham SP, int Ton)> SanPhamHetHang { get; set; } = new();
    public List<BienThe> BienTheHetHang { get; set; } = new();
}

public class DoanhThuVm
{
    public DateRange R { get; set; } = null!;
    public decimal DoanhThu { get; set; }
    public int SoDon { get; set; }
    public decimal TrungBinhDon { get; set; }
    public decimal TongGiam { get; set; }
    public decimal DoanhThuDangCho { get; set; }          // đơn chưa hoàn thành (dự kiến)
    public List<ChartPoint> TheoNgay { get; set; } = new();
    public List<ChartPoint> TheoThang { get; set; } = new();
    public List<ChartPoint> TheoDanhMuc { get; set; } = new();
    public List<ChartPoint> TheoThanhToan { get; set; } = new();
}

public class KpiItem
{
    public string Ten { get; set; } = "";
    public string GiaTri { get; set; } = "";
    public string MucTieu { get; set; } = "";
    public double PhanTram { get; set; }          // % hoàn thành mục tiêu (0–100+)
    public bool Dat { get; set; }
    public string? GhiChu { get; set; }
}

public class KpiVm
{
    public string Thang { get; set; } = "";
    public decimal DoanhThu { get; set; }
    public decimal MucTieuDoanhThu { get; set; }
    public int SoDon { get; set; }
    public int MucTieuDon { get; set; }
    public decimal DoanhThuThangTruoc { get; set; }
    public List<KpiItem> Items { get; set; } = new();
    public List<ChartPoint> DoanhThu6Thang { get; set; } = new();
    public List<ChartPoint> TheoTrangThai { get; set; } = new();
    public List<ChartPoint> DonTheoTuan { get; set; } = new();
}

public class HoanHuyVm
{
    public DateRange R { get; set; } = null!;
    public int TongDon { get; set; }
    public int DonHuy { get; set; }
    public double TyLeHuy { get; set; }
    public decimal TienMatDoHuy { get; set; }
    public int DonDoiTra { get; set; }
    public int DonDaGiao { get; set; }               // hoàn thành + đổi trả
    public double TyLeHoan { get; set; }
    public int YeuCauDoiTra { get; set; }
    public List<ChartPoint> LyDoHuy { get; set; } = new();
    public List<ChartPoint> LyDoDoiTra { get; set; } = new();
    public List<ChartPoint> TheoTrangThai { get; set; } = new();
}

public class SpBanChay
{
    public int MaSP { get; set; }
    public string TenSP { get; set; } = "";
    public string? Anh { get; set; }
    public int SoLuong { get; set; }
    public decimal DoanhThu { get; set; }
    public int TonHienTai { get; set; }
}

public class SanPhamStatVm
{
    public DateRange R { get; set; } = null!;
    public List<SpBanChay> BanChay { get; set; } = new();
    public List<SanPham> ChuaBan { get; set; } = new();
    public List<(SanPham SP, int Ton)> HetHang { get; set; } = new();
    public List<BienThe> BienTheHet { get; set; } = new();
}

public class SizeMauVm
{
    public DateRange R { get; set; } = null!;
    public int TongSoLuong { get; set; }
    public List<ChartPoint> TheoSize { get; set; } = new();
    public List<ChartPoint> TheoMau { get; set; } = new();
    public List<ChartPoint> TopKetHop { get; set; } = new();
}
