using DailyMan.Data;
using DailyMan.Helpers;
using DailyMan.Models;
using DailyMan.Services;
using DailyMan.ViewModels;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DailyMan.Controllers;

[Authorize]
public class OrderController : BaseController
{
    private readonly AppDbContext _db;
    private readonly CartService _cart;
    private readonly CheckoutService _checkout;
    private readonly VoucherService _vouchers;
    private readonly OrderService _orders;

    public OrderController(AppDbContext db, CartService cart, CheckoutService checkout, VoucherService vouchers, OrderService orders)
    { _db = db; _cart = cart; _checkout = checkout; _vouchers = vouchers; _orders = orders; }

    // ---------- Thanh toán ----------
    [HttpGet] public IActionResult Checkout() => RedirectToAction("Index", "Cart");

    /// <summary>
    /// Một action xử lý 3 bước: (act rỗng) hiện trang thanh toán từ giỏ hàng, (act=apply) áp mã giảm giá, (act=place) đặt hàng.
    /// </summary>
    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Checkout(int[]? selected, int? maDC, int maPT, string? code, string? ghiChu, string? act)
    {
        var maTK = User.UserId();
        var all = await _cart.GetLinesAsync(maTK);
        selected ??= Array.Empty<int>();
        var lines = all.Where(l => selected.Contains(l.MaBT)).ToList();
        if (lines.Count == 0) { Loi("Bạn chưa chọn sản phẩm nào để thanh toán."); return RedirectToAction("Index", "Cart"); }

        var diaChis = await _db.DiaChis.AsNoTracking().Where(d => d.MaTK == maTK).OrderByDescending(d => d.MacDinh).ToListAsync();
        if (diaChis.Count == 0) { Loi("Bạn cần thêm địa chỉ nhận hàng trước khi thanh toán."); return RedirectToAction("AddressForm", "Account"); }
        var dc = diaChis.FirstOrDefault(d => d.MaDC == maDC) ?? diaChis[0];
        if (maPT == 0) maPT = 1;
        code = VoucherService.Chuan(code);

        if (act == "place")
        {
            var (maDH, loi) = await _orders.PlaceAsync(new PlaceOrderInput
            {
                MaTK = maTK, Selected = selected, Ten = dc.TenNguoiNhan, Sdt = dc.SDT, DiaChi = dc.DayDu,
                GhiChu = ghiChu, MaPT = maPT, Code = code
            });
            if (loi == null) { ThongBao($"Đặt hàng thành công! Mã đơn #{maDH}."); return RedirectToAction(nameof(Details), new { id = maDH }); }
            Loi(loi);
        }

        var vm = new CheckoutVm
        {
            Lines = lines, DiaChis = diaChis, Selected = selected, MaDC = dc.MaDC, MaPT = maPT, Code = code, GhiChu = ghiChu,
            PhuongThucs = await _db.PhuongThucThanhToans.AsNoTracking().OrderBy(p => p.MaPT).ToListAsync(),
            Tinh = await _checkout.CalculateAsync(maTK, lines, code),
            Vouchers = await _vouchers.OptionsAsync(maTK, lines)
        };
        if (act == "apply" && vm.Tinh.Voucher != null) ThongBao($"Đã áp dụng mã {vm.Tinh.Voucher.MaCode}.");
        if (act == "apply" && vm.Tinh.LoiVoucher != null) Loi(vm.Tinh.LoiVoucher);
        return View(vm);
    }

    // ---------- Đơn của tôi ----------
    public async Task<IActionResult> Index(int? st, int page = 1)
    {
        var maTK = User.UserId();
        var q = _db.DonHangs.AsNoTracking().Include(d => d.TrangThai).Include(d => d.ThanhToan).Include(d => d.ChiTiets).Where(d => d.MaTK == maTK);
        if (st.HasValue) q = q.Where(d => d.MaTrangThai == st);
        ViewBag.St = st;
        ViewBag.Dem = await _db.DonHangs.Where(d => d.MaTK == maTK).GroupBy(d => d.MaTrangThai).Select(g => new { g.Key, N = g.Count() }).ToDictionaryAsync(x => x.Key, x => x.N);
        return View(await PagedList<DonHang>.CreateAsync(q.OrderByDescending(d => d.NgayDat), page, Const.ADMIN_PAGE_SIZE));
    }

    public async Task<IActionResult> Details(int id)
    {
        var d = await _orders.LoadDetailAsync(id, User.UserId());
        if (d == null) return NotFound();
        ViewBag.DoiTra = await _db.YeuCauDoiTras.AsNoTracking().Where(y => y.MaDH == id).OrderByDescending(y => y.MaYC).FirstOrDefaultAsync();
        return View(d);
    }

    /// <summary>Khách chỉ được hủy khi đơn còn "Chờ xác nhận", bắt buộc chọn lý do.</summary>
    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Cancel(int id, string? lyDo, string? ghiChu)
    {
        var loi = await _orders.CancelAsync(id, new[] { Const.CHO }, User.UserId(), lyDo, ghiChu, User.UserId());
        if (loi != null) Loi(loi); else ThongBao("Đã hủy đơn hàng.");
        return RedirectToAction(nameof(Details), new { id });
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> RequestReturn(int id, string? nhom, string? chiTiet)
    {
        var loi = await _orders.RequestReturnAsync(id, User.UserId(), nhom, chiTiet);
        if (loi != null) Loi(loi); else ThongBao("Đã gửi yêu cầu đổi trả. Cửa hàng sẽ phản hồi sớm.");
        return RedirectToAction(nameof(Details), new { id });
    }
}
