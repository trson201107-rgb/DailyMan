using DailyMan.Data;
using DailyMan.Models;
using DailyMan.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DailyMan.Areas.Admin.Controllers;

public class DashboardController : AdminBaseController
{
    private readonly AppDbContext _db;
    private readonly StatsService _stats;
    public DashboardController(AppDbContext db, StatsService stats) { _db = db; _stats = stats; }

    public async Task<IActionResult> Index(string? tu, string? den, string? preset)
    {
        var r = StatsService.Range(tu, den, preset ?? "7");
        ViewBag.DoanhThu = await _stats.DoanhThuAsync(r);
        ViewBag.SanPham = await _stats.SanPhamAsync(r);
        ViewBag.ChoXacNhan = await _db.DonHangs.CountAsync(d => d.MaTrangThai == Const.CHO);
        ViewBag.DoiTraCho = await _db.YeuCauDoiTras.CountAsync(y => y.TrangThai == Const.DT_CHO);
        ViewBag.KhachMoi = await _db.TaiKhoans.CountAsync(t => t.NgayTao >= r.From && t.VaiTro!.TenVaiTro == Const.ROLE_CUSTOMER);
        ViewBag.TonKho = await _stats.TonKhoAsync();
        ViewBag.GanDay = await _db.DonHangs.AsNoTracking().Include(d => d.TrangThai).Include(d => d.ThanhToan).OrderByDescending(d => d.NgayDat).Take(6).ToListAsync();
        return View(r);
    }
}
