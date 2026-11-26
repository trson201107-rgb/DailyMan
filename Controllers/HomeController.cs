using DailyMan.Data;
using DailyMan.Models;
using DailyMan.ViewModels;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DailyMan.Controllers;

public class HomeController : BaseController
{
    private readonly AppDbContext _db;
    public HomeController(AppDbContext db) => _db = db;

    public async Task<IActionResult> Index()
    {
        var ban = _db.SanPhams.AsNoTracking().Include(s => s.DanhMuc).Include(s => s.BienThes).Where(s => s.TrangThai == Const.SP_BAN);
        var moiTu = DateTime.Now.AddDays(-Const.NEW_DAYS);
        var vm = new HomeVm
        {
            DanhMucs = await _db.DanhMucs.AsNoTracking().OrderBy(d => d.MaDM).ToListAsync(),
            Hot = await ban.OrderByDescending(s => s.LuotXem).Take(4).ToListAsync(),
            Moi = await ban.Where(s => s.NgayTao >= moiTu).OrderByDescending(s => s.NgayTao).Take(4).ToListAsync(),
            Giam = await ban.Where(s => s.GiaGoc != null && s.GiaGoc > s.GiaBan).OrderByDescending(s => s.GiaGoc - s.GiaBan).Take(4).ToListAsync()
        };
        return View(vm);
    }

    public IActionResult Error(int? code)
    {
        Response.StatusCode = code ?? 500;
        ViewBag.Code = code ?? 500;
        ViewBag.Msg = code == 404 ? "Trang bạn tìm không tồn tại." : code == 403 ? "Bạn không có quyền truy cập trang này." : "Hệ thống đang gặp sự cố. Vui lòng thử lại sau.";
        return View();
    }
}
