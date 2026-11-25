using System.Text;
using DailyMan.Data;
using DailyMan.Helpers;
using DailyMan.Models;
using DailyMan.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DailyMan.Areas.Admin.Controllers;

public class OrdersController : AdminBaseController
{
    private readonly AppDbContext _db;
    private readonly OrderService _orders;
    public OrdersController(AppDbContext db, OrderService orders) { _db = db; _orders = orders; }

    private IQueryable<DonHang> Loc(string? q, int? st, string? tu, string? den)
    {
        var query = _db.DonHangs.AsNoTracking().Include(d => d.TrangThai).Include(d => d.ThanhToan).ThenInclude(t => t!.PhuongThuc).Include(d => d.TaiKhoan).Include(d => d.ChiTiets).AsQueryable();
        if (st.HasValue) query = query.Where(d => d.MaTrangThai == st);
        if (!string.IsNullOrWhiteSpace(q))
        {
            var k = q.Trim();
            if (int.TryParse(k, out var ma)) query = query.Where(d => d.MaDH == ma || d.SDTNguoiNhan.Contains(k));
            else query = query.Where(d => d.TenNguoiNhan.Contains(k) || d.SDTNguoiNhan.Contains(k) || d.TaiKhoan!.HoTen.Contains(k));
        }
        if (DateTime.TryParse(tu, out var t)) query = query.Where(d => d.NgayDat >= t.Date);
        if (DateTime.TryParse(den, out var e)) query = query.Where(d => d.NgayDat < e.Date.AddDays(1));
        return query.OrderByDescending(d => d.NgayDat);
    }

    public async Task<IActionResult> Index(string? q, int? st, string? tu, string? den, int page = 1)
    {
        ViewBag.Dem = await _db.DonHangs.GroupBy(d => d.MaTrangThai).Select(g => new { g.Key, N = g.Count() }).ToDictionaryAsync(x => x.Key, x => x.N);
        return View(await PagedList<DonHang>.CreateAsync(Loc(q, st, tu, den), page, Const.ADMIN_PAGE_SIZE));
    }

    public async Task<IActionResult> Details(int id)
    {
        var d = await _orders.LoadDetailAsync(id, null);
        if (d == null) return NotFound();
        return View(d);
    }

    /// <summary>Chuyển đơn sang bước kế tiếp (chờ xác nhận → xác nhận → đóng gói → giao → hoàn thành).</summary>
    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Advance(int id, string? back)
    {
        var loi = await _orders.AdvanceAsync(id, User.UserId());
        if (loi != null) Loi(loi); else ThongBao($"Đã cập nhật trạng thái đơn #{id}.");
        return back == "list" ? RedirectToAction(nameof(Index)) : RedirectToAction(nameof(Details), new { id });
    }

    /// <summary>Nhân viên / quản trị hủy đơn khi còn Chờ xác nhận, Đã xác nhận hoặc Đang đóng gói.</summary>
    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Cancel(int id, string? lyDo, string? ghiChu)
    {
        var loi = await _orders.CancelAsync(id, new[] { Const.CHO, Const.XAC_NHAN, Const.DONG_GOI }, User.UserId(), lyDo, ghiChu, null);
        if (loi != null) Loi(loi); else ThongBao($"Đã hủy đơn #{id} và hoàn lại tồn kho.");
        return RedirectToAction(nameof(Details), new { id });
    }

    public async Task<IActionResult> Export(string? q, int? st, string? tu, string? den)
    {
        var list = await Loc(q, st, tu, den).ToListAsync();
        var sb = new StringBuilder("\uFEFFMã đơn,Ngày đặt,Khách hàng,SĐT,Trạng thái,Thanh toán,Tổng tiền\r\n");
        foreach (var d in list)
            sb.AppendLine($"{d.MaDH},{d.NgayDat:dd/MM/yyyy HH:mm},\"{d.TenNguoiNhan}\",{d.SDTNguoiNhan},{d.TrangThai?.TenTrangThai},{d.ThanhToan?.PhuongThuc?.TenPT},{d.ThanhToan?.SoTien:0}");
        return File(Encoding.UTF8.GetBytes(sb.ToString()), "text/csv", $"don-hang-{DateTime.Now:yyyyMMdd}.csv");
    }
}
