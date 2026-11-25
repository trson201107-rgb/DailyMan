using DailyMan.Helpers;
using DailyMan.Models;

namespace DailyMan.ViewModels;

public class ShopFilter
{
    public string? Q { get; set; }
    public int? MaDM { get; set; }
    public string? Gia { get; set; }          // duoi300 | 300-500 | tren500
    public int[]? MaMau { get; set; }
    public int[]? MaSize { get; set; }
    public string? Tag { get; set; }          // hot | moi | giam
    public bool ConHang { get; set; }
    public string? Sort { get; set; }         // moi | giatang | giagiam | hot
    public int Page { get; set; } = 1;
}

public class ShopIndexVm
{
    public ShopFilter F { get; set; } = new();
    public PagedList<SanPham> Items { get; set; } = null!;
    public List<DanhMuc> DanhMucs { get; set; } = new();
    public List<MauSac> Maus { get; set; } = new();
    public List<KichCo> Sizes { get; set; } = new();
}

public class HomeVm
{
    public List<DanhMuc> DanhMucs { get; set; } = new();
    public List<SanPham> Hot { get; set; } = new();
    public List<SanPham> Moi { get; set; } = new();
    public List<SanPham> Giam { get; set; } = new();
}

public class ProductDetailVm
{
    public SanPham SP { get; set; } = null!;
    public List<MauSac> Maus { get; set; } = new();
    public List<KichCo> Sizes { get; set; } = new();
    public List<SanPham> LienQuan { get; set; } = new();
    public double SaoTB { get; set; }
    public bool DuocDanhGia { get; set; }
}
