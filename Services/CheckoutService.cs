using DailyMan.Models;
using DailyMan.ViewModels;

namespace DailyMan.Services;

/// <summary>Tính tiền: tiền hàng, phí ship, ưu đãi hạng thành viên và mã giảm giá.</summary>
public class CheckoutService
{
    private readonly TierService _tier;
    private readonly VoucherService _vouchers;
    public CheckoutService(TierService tier, VoucherService vouchers) { _tier = tier; _vouchers = vouchers; }

    public static decimal PhiShip(decimal tienHang) => tienHang >= Const.FREE_SHIP_FROM ? 0 : Const.SHIP_FEE;

    public async Task<CheckoutResult> CalculateAsync(int maTK, List<CartLineVm> lines, string? code)
    {
        var r = new CheckoutResult { TienHang = lines.Sum(l => l.ThanhTien) };
        r.Phi = lines.Count == 0 ? 0 : PhiShip(r.TienHang);

        var (giam, ten, pct) = await _tier.UuDaiAsync(maTK, r.TienHang);
        r.UuDaiHang = giam; r.TenHang = ten; r.PhanTramHang = pct;

        if (!string.IsNullOrWhiteSpace(code))
        {
            var v = await _vouchers.FindByCodeAsync(code);
            if (v == null) r.LoiVoucher = "Mã giảm giá không tồn tại.";
            else
            {
                var (ok, loi, g) = await _vouchers.EvaluateAsync(v, maTK, lines);
                if (!ok) r.LoiVoucher = loi;
                else { r.Voucher = v; r.GiamVoucher = Math.Min(g, r.TienHang - r.UuDaiHang); }
            }
        }
        return r;
    }
}
