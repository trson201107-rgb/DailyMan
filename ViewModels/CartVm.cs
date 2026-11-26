namespace DailyMan.ViewModels;

/// <summary>Một dòng trong giỏ hàng (đã ghép sẵn thông tin sản phẩm để hiển thị / tính tiền).</summary>
public class CartLineVm
{
    public int MaBT { get; set; }
    public int MaSP { get; set; }
    public int MaDM { get; set; }
    public string TenSP { get; set; } = "";
    public string SKU { get; set; } = "";
    public string Mau { get; set; } = "";
    public string Size { get; set; } = "";
    public string? Anh { get; set; }
    public decimal GiaBan { get; set; }
    public decimal? GiaLucThem { get; set; }
    public string TrangThaiSP { get; set; } = "";
    public int SoLuong { get; set; }
    public int Ton { get; set; }
    public decimal ThanhTien => GiaBan * SoLuong;
    public bool GiaDoi => GiaLucThem.HasValue && GiaLucThem.Value != GiaBan;
}

/// <summary>Kết quả tính tiền ở bước thanh toán.</summary>
public class CheckoutResult
{
    public decimal TienHang { get; set; }
    public decimal Phi { get; set; }
    public decimal UuDaiHang { get; set; }
    public string? TenHang { get; set; }
    public int PhanTramHang { get; set; }
    public decimal GiamVoucher { get; set; }
    public Models.Voucher? Voucher { get; set; }
    public string? LoiVoucher { get; set; }
    public decimal TongGiam => UuDaiHang + GiamVoucher;
    public decimal Tong => TienHang + Phi - TongGiam;
}

/// <summary>Một mã giảm giá hiển thị ở trang thanh toán kèm trạng thái "dùng được / chưa dùng được".</summary>
public class VoucherOption
{
    public Models.Voucher Voucher { get; set; } = null!;
    public bool DungDuoc { get; set; }
    public string? LyDo { get; set; }
    public decimal Giam { get; set; }
}

public class CheckoutVm
{
    public List<CartLineVm> Lines { get; set; } = new();
    public List<Models.DiaChi> DiaChis { get; set; } = new();
    public List<Models.PhuongThucThanhToan> PhuongThucs { get; set; } = new();
    public List<VoucherOption> Vouchers { get; set; } = new();
    public CheckoutResult Tinh { get; set; } = new();
    public int[] Selected { get; set; } = Array.Empty<int>();
    public int? MaDC { get; set; }
    public int MaPT { get; set; } = 1;
    public string? Code { get; set; }
    public string? GhiChu { get; set; }
}
