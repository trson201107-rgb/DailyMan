using DailyMan.Data;
using DailyMan.Helpers;
using DailyMan.Models;
using DailyMan.ViewModels;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DailyMan.Controllers;

public class ShopController : BaseController
{
    private readonly AppDbContext _db;
    public ShopController(AppDbContext db) => _db = db;

    /// <summary>Danh sách sản phẩm: tìm kiếm, lọc, sắp xếp, phân trang.</summary>
    public async Task<IActionResult> Index(ShopFilter f)
    {
        var q = _db.SanPhams.AsNoTracking().Include(s => s.DanhMuc).Include(s => s.BienThes).Where(s => s.TrangThai == Const.SP_BAN);

        if (!string.IsNullOrWhiteSpace(f.Q)) { var k = f.Q.Trim(); q = q.Where(s => s.TenSP.Contains(k) || s.DanhMuc!.TenDM.Contains(k)); }
        if (f.MaDM.HasValue) q = q.Where(s => s.MaDM == f.MaDM);
        q = f.Gia switch
        {
            "duoi300" => q.Where(s => s.GiaBan < 300000),
            "300-500" => q.Where(s => s.GiaBan >= 300000 && s.GiaBan <= 500000),
            "tren500" => q.Where(s => s.GiaBan > 500000),
            _ => q
        };
        if (f.MaMau is { Length: > 0 }) { var m = f.MaMau; q = q.Where(s => s.BienThes.Any(b => m.Contains(b.MaMau))); }
        if (f.MaSize is { Length: > 0 }) { var z = f.MaSize; q = q.Where(s => s.BienThes.Any(b => z.Contains(b.MaSize))); }
        if (f.ConHang) q = q.Where(s => s.BienThes.Any(b => b.SoLuongTon > 0));
        var moiTu = DateTime.Now.AddDays(-Const.NEW_DAYS);
        q = f.Tag switch
        {
            "hot" => q.Where(s => s.LuotXem >= Const.HOT_MIN_VIEWS),
            "moi" => q.Where(s => s.NgayTao >= moiTu),
            "giam" => q.Where(s => s.GiaGoc != null && s.GiaGoc > s.GiaBan),
            _ => q
        };
        q = f.Sort switch
        {
            "giatang" => q.OrderBy(s => s.GiaBan),
            "giagiam" => q.OrderByDescending(s => s.GiaBan),
            "hot" => q.OrderByDescending(s => s.LuotXem),
            _ => q.OrderByDescending(s => s.NgayTao)
        };

        var vm = new ShopIndexVm
        {
            F = f,
            Items = await PagedList<SanPham>.CreateAsync(q, f.Page, Const.PAGE_SIZE),
            DanhMucs = await _db.DanhMucs.AsNoTracking().OrderBy(d => d.MaDM).ToListAsync(),
            Maus = await _db.MauSacs.AsNoTracking().OrderBy(m => m.MaMau).ToListAsync(),
            Sizes = await _db.KichCos.AsNoTracking().OrderBy(s => s.ThuTu).ToListAsync()
        };
        return View(vm);
    }

    public async Task<IActionResult> Details(int id)
    {
        var sp = await _db.SanPhams
            .Include(s => s.DanhMuc).Include(s => s.Anhs)
            .Include(s => s.BienThes).ThenInclude(b => b.MauSac)
            .Include(s => s.BienThes).ThenInclude(b => b.KichCo)
            .Include(s => s.DanhGias).ThenInclude(d => d.TaiKhoan)
            .FirstOrDefaultAsync(s => s.MaSP == id);
        if (sp == null || (sp.TrangThai != Const.SP_BAN && !User.IsStaffOrAdmin())) return NotFound();

        sp.LuotXem++;
        await _db.SaveChangesAsync();

        var vm = new ProductDetailVm
        {
            SP = sp,
            Maus = sp.BienThes.Select(b => b.MauSac!).DistinctBy(m => m.MaMau).OrderBy(m => m.MaMau).ToList(),
            Sizes = sp.BienThes.Select(b => b.KichCo!).DistinctBy(s => s.MaSize).OrderBy(s => s.ThuTu).ToList(),
            LienQuan = await _db.SanPhams.AsNoTracking().Include(s => s.DanhMuc).Include(s => s.BienThes)
                .Where(s => s.MaDM == sp.MaDM && s.MaSP != sp.MaSP && s.TrangThai == Const.SP_BAN).OrderByDescending(s => s.LuotXem).Take(4).ToListAsync(),
            SaoTB = sp.DanhGias.Count == 0 ? 0 : Math.Round(sp.DanhGias.Average(d => d.SoSao), 1)
        };
        if (User.Identity?.IsAuthenticated == true)
        {
            var maTK = User.UserId();
            var daMua = await _db.ChiTietDonHangs.AnyAsync(c => c.BienThe!.MaSP == id && _db.DonHangs.Any(d => d.MaDH == c.MaDH && d.MaTK == maTK && d.MaTrangThai == Const.HOAN_THANH));
            vm.DuocDanhGia = daMua && !sp.DanhGias.Any(d => d.MaTK == maTK);
        }
        return View(vm);
    }

    /// <summary>Chỉ khách đã nhận hàng (đơn Hoàn thành) mới được đánh giá, mỗi sản phẩm 1 lần.</summary>
    [Authorize, HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Review(int id, int soSao, string? noiDung)
    {
        var maTK = User.UserId();
        var daMua = await _db.ChiTietDonHangs.AnyAsync(c => c.BienThe!.MaSP == id && _db.DonHangs.Any(d => d.MaDH == c.MaDH && d.MaTK == maTK && d.MaTrangThai == Const.HOAN_THANH));
        if (!daMua) Loi("Chỉ khách đã nhận hàng mới được đánh giá sản phẩm.");
        else if (soSao is < 1 or > 5) Loi("Số sao phải từ 1 đến 5.");
        else if (await _db.DanhGias.AnyAsync(d => d.MaSP == id && d.MaTK == maTK)) Loi("Bạn đã đánh giá sản phẩm này rồi.");
        else
        {
            _db.DanhGias.Add(new DanhGia { MaSP = id, MaTK = maTK, SoSao = soSao, NoiDung = noiDung?.Trim() });
            await _db.SaveChangesAsync();
            ThongBao("Cảm ơn bạn đã đánh giá!");
        }
        return RedirectToAction(nameof(Details), new { id });
    }
}
