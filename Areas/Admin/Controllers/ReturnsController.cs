using DailyMan.Data;
using DailyMan.Helpers;
using DailyMan.Models;
using DailyMan.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DailyMan.Areas.Admin.Controllers;

public class ReturnsController : AdminBaseController
{
    private readonly AppDbContext _db;
    private readonly OrderService _orders;
    public ReturnsController(AppDbContext db, OrderService orders) { _db = db; _orders = orders; }

    public async Task<IActionResult> Index(string? tt, int page = 1)
    {
        var q = _db.YeuCauDoiTras.AsNoTracking().Include(y => y.DonHang).AsQueryable();
        if (!string.IsNullOrEmpty(tt)) q = q.Where(y => y.TrangThai == tt);
        ViewBag.Tt = tt;
        ViewBag.Ten = await _db.TaiKhoans.AsNoTracking().ToDictionaryAsync(t => t.MaTK, t => t.HoTen);
        return View(await PagedList<YeuCauDoiTra>.CreateAsync(q.OrderBy(y => y.TrangThai == Const.DT_CHO ? 0 : 1).ThenByDescending(y => y.NgayTao), page, Const.ADMIN_PAGE_SIZE));
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Resolve(int id, bool chapNhan, string? lyDoTuChoi)
    {
        var loi = await _orders.ResolveReturnAsync(id, chapNhan, lyDoTuChoi, User.UserId());
        if (loi != null) Loi(loi); else ThongBao(chapNhan ? "Đã chấp nhận yêu cầu đổi trả." : "Đã từ chối yêu cầu đổi trả.");
        return RedirectToAction(nameof(Index));
    }
}
