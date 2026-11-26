using DailyMan.Data;
using DailyMan.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DailyMan.Areas.Admin.Controllers;

[Authorize(Roles = Const.ROLE_ADMIN)]
public class CategoriesController : AdminBaseController
{
    private readonly AppDbContext _db;
    public CategoriesController(AppDbContext db) => _db = db;

    public async Task<IActionResult> Index()
    {
        ViewBag.Dem = await _db.SanPhams.GroupBy(s => s.MaDM).Select(g => new { g.Key, N = g.Count() }).ToDictionaryAsync(x => x.Key, x => x.N);
        return View(await _db.DanhMucs.AsNoTracking().OrderBy(d => d.MaDM).ToListAsync());
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Save(int maDM, string? tenDM, string? moTa)
    {
        if (string.IsNullOrWhiteSpace(tenDM)) { Loi("Tên danh mục không được để trống."); return RedirectToAction(nameof(Index)); }
        tenDM = tenDM.Trim();
        if (await _db.DanhMucs.AnyAsync(d => d.TenDM == tenDM && d.MaDM != maDM)) { Loi("Tên danh mục đã tồn tại."); return RedirectToAction(nameof(Index)); }
        if (maDM == 0) _db.DanhMucs.Add(new DanhMuc { TenDM = tenDM, MoTa = moTa?.Trim() });
        else
        {
            var d = await _db.DanhMucs.FindAsync(maDM);
            if (d == null) return NotFound();
            d.TenDM = tenDM; d.MoTa = moTa?.Trim();
        }
        await _db.SaveChangesAsync();
        ThongBao("Đã lưu danh mục.");
        return RedirectToAction(nameof(Index));
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Delete(int id)
    {
        if (await _db.SanPhams.AnyAsync(s => s.MaDM == id)) { Loi("Danh mục đang có sản phẩm nên không thể xóa."); return RedirectToAction(nameof(Index)); }
        var d = await _db.DanhMucs.FindAsync(id);
        if (d != null) { _db.DanhMucs.Remove(d); await _db.SaveChangesAsync(); ThongBao("Đã xóa danh mục."); }
        return RedirectToAction(nameof(Index));
    }
}
