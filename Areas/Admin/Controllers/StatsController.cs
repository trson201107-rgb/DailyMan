using DailyMan.Models;
using DailyMan.Services;
using Microsoft.AspNetCore.Mvc;

namespace DailyMan.Areas.Admin.Controllers;

/// <summary>Phân hệ Thống kê (menu thả xuống ở thanh bên, ngay dưới "Xem cửa hàng").</summary>
public class StatsController : AdminBaseController
{
    private readonly StatsService _stats;
    private readonly ConfigService _cfg;
    public StatsController(StatsService stats, ConfigService cfg) { _stats = stats; _cfg = cfg; }

    public IActionResult Index() => RedirectToAction(nameof(Inventory));

    public async Task<IActionResult> Inventory() => View(await _stats.TonKhoAsync());

    public async Task<IActionResult> Revenue(string? tu, string? den, string? preset) =>
        View(await _stats.DoanhThuAsync(StatsService.Range(tu, den, preset)));

    public async Task<IActionResult> Kpi() => View(await _stats.KpiAsync());

    [Microsoft.AspNetCore.Authorization.Authorize(Roles = Const.ROLE_ADMIN), HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> SaveTargets(decimal mucTieuDoanhThu, int mucTieuDon)
    {
        if (mucTieuDoanhThu <= 0 || mucTieuDon <= 0) { Loi("Mục tiêu phải lớn hơn 0."); return RedirectToAction(nameof(Kpi)); }
        await _cfg.SetAsync(Const.CFG_MUC_TIEU_DOANH_THU, ((long)mucTieuDoanhThu).ToString());
        await _cfg.SetAsync(Const.CFG_MUC_TIEU_DON, mucTieuDon.ToString());
        ThongBao("Đã cập nhật mục tiêu KPI.");
        return RedirectToAction(nameof(Kpi));
    }

    public async Task<IActionResult> ReturnsCancels(string? tu, string? den, string? preset) =>
        View(await _stats.HoanHuyAsync(StatsService.Range(tu, den, preset)));

    public async Task<IActionResult> Products(string? tu, string? den, string? preset) =>
        View(await _stats.SanPhamAsync(StatsService.Range(tu, den, preset)));

    public async Task<IActionResult> SizeColor(string? tu, string? den, string? preset) =>
        View(await _stats.SizeMauAsync(StatsService.Range(tu, den, preset)));
}
