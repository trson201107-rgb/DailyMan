using DailyMan.Data;
using DailyMan.Helpers;
using DailyMan.Models;
using DailyMan.ViewModels;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DailyMan.Areas.Admin.Controllers;

public class ProductsController : AdminBaseController
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;
    public ProductsController(AppDbContext db, IWebHostEnvironment env) { _db = db; _env = env; }

    private async Task LoadListsAsync()
    {
        ViewBag.DanhMucs = await _db.DanhMucs.AsNoTracking().OrderBy(d => d.MaDM).ToListAsync();
        ViewBag.Maus = await _db.MauSacs.AsNoTracking().OrderBy(m => m.MaMau).ToListAsync();
        ViewBag.Sizes = await _db.KichCos.AsNoTracking().OrderBy(s => s.ThuTu).ToListAsync();
    }

    public async Task<IActionResult> Index(string? q, int? maDM, string? tt, string? ton, string? sort, int page = 1)
    {
        var query = _db.SanPhams.AsNoTracking().Include(s => s.DanhMuc).Include(s => s.BienThes).AsQueryable();
        if (!string.IsNullOrWhiteSpace(q)) { var k = q.Trim(); query = query.Where(s => s.TenSP.Contains(k)); }
        if (maDM.HasValue) query = query.Where(s => s.MaDM == maDM);
        if (!string.IsNullOrEmpty(tt)) query = query.Where(s => s.TrangThai == tt);
        if (ton == "het") query = query.Where(s => !s.BienThes.Any(b => b.SoLuongTon > 0));
        else if (ton == "sap") query = query.Where(s => s.BienThes.Sum(b => b.SoLuongTon) > 0 && s.BienThes.Sum(b => b.SoLuongTon) <= Const.LOW_STOCK);
        else if (ton == "con") query = query.Where(s => s.BienThes.Sum(b => b.SoLuongTon) > Const.LOW_STOCK);
        query = sort switch
        {
            "gia" => query.OrderBy(s => s.GiaBan),
            "tonit" => query.OrderBy(s => s.BienThes.Sum(b => b.SoLuongTon)),
            "ten" => query.OrderBy(s => s.TenSP),
            _ => query.OrderByDescending(s => s.NgayTao)
        };
        await LoadListsAsync();
        return View(await PagedList<SanPham>.CreateAsync(query, page, Const.ADMIN_PAGE_SIZE));
    }

    public async Task<IActionResult> Details(int id)
    {
        var sp = await _db.SanPhams.AsNoTracking().Include(s => s.DanhMuc).Include(s => s.Anhs)
            .Include(s => s.BienThes).ThenInclude(b => b.MauSac).Include(s => s.BienThes).ThenInclude(b => b.KichCo)
            .FirstOrDefaultAsync(s => s.MaSP == id);
        if (sp == null) return NotFound();
        var ids = sp.BienThes.Select(b => b.MaBT).ToList();
        ViewBag.LichSu = await _db.LsTonKhos.AsNoTracking().Include(l => l.BienThe).ThenInclude(b => b!.MauSac).Include(l => l.BienThe).ThenInclude(b => b!.KichCo)
            .Where(l => ids.Contains(l.MaBT)).OrderByDescending(l => l.ThoiGian).Take(12).ToListAsync();
        ViewBag.DaBan = await _db.ChiTietDonHangs.Where(c => ids.Contains(c.MaBT)).Select(c => c.MaBT).Distinct().ToListAsync();
        await LoadListsAsync();
        return View(sp);
    }

    // ---------- Thêm / sửa sản phẩm (chỉ Admin) ----------
    [Authorize(Roles = Const.ROLE_ADMIN), HttpGet]
    public async Task<IActionResult> Form(int? id)
    {
        await LoadListsAsync();
        if (id == null) return View(new ProductFormVm());
        var s = await _db.SanPhams.AsNoTracking().FirstOrDefaultAsync(x => x.MaSP == id);
        if (s == null) return NotFound();
        return View(new ProductFormVm { MaSP = s.MaSP, TenSP = s.TenSP, GiaBan = s.GiaBan, GiaGoc = s.GiaGoc, MaDM = s.MaDM, MoTa = s.MoTa, TrangThai = s.TrangThai });
    }

    [Authorize(Roles = Const.ROLE_ADMIN), HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Form(ProductFormVm vm)
    {
        if (vm.GiaGoc is > 0 && vm.GiaGoc <= vm.GiaBan) ModelState.AddModelError(nameof(vm.GiaGoc), "Giá gốc phải lớn hơn giá bán (hoặc để trống nếu không giảm giá).");
        if (!ModelState.IsValid) { await LoadListsAsync(); return View(vm); }
        SanPham s;
        if (vm.MaSP == 0) { s = new SanPham { NguoiTao = User.UserId() }; _db.SanPhams.Add(s); }
        else { s = await _db.SanPhams.FirstAsync(x => x.MaSP == vm.MaSP); }
        s.TenSP = vm.TenSP.Trim(); s.GiaBan = vm.GiaBan; s.GiaGoc = vm.GiaGoc is > 0 ? vm.GiaGoc : null; s.MaDM = vm.MaDM; s.MoTa = vm.MoTa?.Trim(); s.TrangThai = vm.TrangThai;
        s.NgayCapNhat = DateTime.Now; s.NguoiCapNhat = User.UserId();
        await _db.SaveChangesAsync();
        ThongBao(vm.MaSP == 0 ? "Đã tạo sản phẩm. Hãy thêm màu / size và tồn kho bên dưới." : "Đã cập nhật sản phẩm.");
        return RedirectToAction(nameof(Details), new { id = s.MaSP });
    }

    [Authorize(Roles = Const.ROLE_ADMIN), HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Toggle(int id)
    {
        var s = await _db.SanPhams.FirstOrDefaultAsync(x => x.MaSP == id);
        if (s == null) return NotFound();
        s.TrangThai = s.TrangThai == Const.SP_BAN ? Const.SP_AN : Const.SP_BAN;
        await _db.SaveChangesAsync();
        ThongBao($"Sản phẩm \"{s.TenSP}\" chuyển sang: {s.TrangThai}.");
        return RedirectToAction(nameof(Index));
    }

    [Authorize(Roles = Const.ROLE_ADMIN), HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Delete(int id)
    {
        var s = await _db.SanPhams.Include(x => x.BienThes).Include(x => x.Anhs).Include(x => x.DanhGias).FirstOrDefaultAsync(x => x.MaSP == id);
        if (s == null) return NotFound();
        var ids = s.BienThes.Select(b => b.MaBT).ToList();
        if (await _db.ChiTietDonHangs.AnyAsync(c => ids.Contains(c.MaBT))) { Loi("Sản phẩm đã có trong đơn hàng nên không thể xóa. Hãy chuyển sang \"Ngừng bán\"."); return RedirectToAction(nameof(Index)); }
        _db.ChiTietGioHangs.RemoveRange(await _db.ChiTietGioHangs.Where(c => ids.Contains(c.MaBT)).ToListAsync());
        _db.LsTonKhos.RemoveRange(await _db.LsTonKhos.Where(l => ids.Contains(l.MaBT)).ToListAsync());
        _db.DanhGias.RemoveRange(s.DanhGias);
        _db.AnhSanPhams.RemoveRange(s.Anhs);
        _db.BienThes.RemoveRange(s.BienThes);
        _db.SanPhams.Remove(s);
        await _db.SaveChangesAsync();
        ThongBao("Đã xóa sản phẩm.");
        return RedirectToAction(nameof(Index));
    }

    // ---------- Biến thể (màu + size) & tồn kho ----------
    [Authorize(Roles = Const.ROLE_ADMIN), HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> AddVariant(int maSP, int maMau, int maSize, int soLuong)
    {
        if (soLuong < 0) { Loi("Số lượng không được âm."); return RedirectToAction(nameof(Details), new { id = maSP }); }
        if (await _db.BienThes.AnyAsync(b => b.MaSP == maSP && b.MaMau == maMau && b.MaSize == maSize)) { Loi("Phiên bản màu + size này đã tồn tại."); return RedirectToAction(nameof(Details), new { id = maSP }); }
        var bt = new BienThe { MaSP = maSP, MaMau = maMau, MaSize = maSize, SoLuongTon = soLuong, SKU = $"SP{maSP}-M{maMau}-S{maSize}-{DateTime.Now:mmss}" };
        _db.BienThes.Add(bt);
        await _db.SaveChangesAsync();
        if (soLuong > 0) _db.LsTonKhos.Add(new LsTonKho { MaBT = bt.MaBT, LoaiThaoTac = "Nhập hàng", SoLuongThayDoi = soLuong, TonSau = soLuong, GhiChu = "Tạo phiên bản mới", MaNguoiThucHien = User.UserId() });
        await _db.SaveChangesAsync();
        ThongBao("Đã thêm phiên bản.");
        return RedirectToAction(nameof(Details), new { id = maSP });
    }

    /// <summary>Nhập hàng (+), điều chỉnh (±) hoặc kiểm kê (đặt lại đúng số đếm được). Mọi thao tác đều ghi lịch sử tồn kho.</summary>
    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> AdjustStock(int maBT, string loai, int so, string? ghiChu)
    {
        var bt = await _db.BienThes.FirstOrDefaultAsync(b => b.MaBT == maBT);
        if (bt == null) return NotFound();
        int moi = loai switch { "Nhập hàng" => bt.SoLuongTon + so, "Điều chỉnh" => bt.SoLuongTon + so, "Kiểm kê" => so, _ => -1 };
        if (loai == "Nhập hàng" && so <= 0) { Loi("Số lượng nhập phải lớn hơn 0."); return RedirectToAction(nameof(Details), new { id = bt.MaSP }); }
        if (moi < 0) { Loi("Tồn kho sau thao tác không được âm."); return RedirectToAction(nameof(Details), new { id = bt.MaSP }); }
        _db.LsTonKhos.Add(new LsTonKho { MaBT = maBT, LoaiThaoTac = loai, SoLuongThayDoi = moi - bt.SoLuongTon, TonSau = moi, GhiChu = ghiChu?.Trim(), MaNguoiThucHien = User.UserId() });
        bt.SoLuongTon = moi;
        try { await _db.SaveChangesAsync(); ThongBao("Đã cập nhật tồn kho."); }
        catch (DbUpdateConcurrencyException) { Loi("Có người vừa thay đổi tồn kho của phiên bản này. Vui lòng thử lại."); }
        return RedirectToAction(nameof(Details), new { id = bt.MaSP });
    }

    [Authorize(Roles = Const.ROLE_ADMIN), HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteVariant(int maBT)
    {
        var bt = await _db.BienThes.FirstOrDefaultAsync(b => b.MaBT == maBT);
        if (bt == null) return NotFound();
        if (await _db.ChiTietDonHangs.AnyAsync(c => c.MaBT == maBT)) { Loi("Phiên bản đã từng được bán nên không thể xóa. Hãy đặt tồn kho = 0."); return RedirectToAction(nameof(Details), new { id = bt.MaSP }); }
        _db.ChiTietGioHangs.RemoveRange(await _db.ChiTietGioHangs.Where(c => c.MaBT == maBT).ToListAsync());
        _db.LsTonKhos.RemoveRange(await _db.LsTonKhos.Where(l => l.MaBT == maBT).ToListAsync());
        _db.BienThes.Remove(bt);
        await _db.SaveChangesAsync();
        ThongBao("Đã xóa phiên bản.");
        return RedirectToAction(nameof(Details), new { id = bt.MaSP });
    }

    // ---------- Ảnh ----------
    [Authorize(Roles = Const.ROLE_ADMIN), HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> AddImage(int maSP, int? maMau, string? url, IFormFile? file)
    {
        string? path = null;
        if (file is { Length: > 0 })
        {
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!new[] { ".jpg", ".jpeg", ".png", ".webp", ".svg" }.Contains(ext)) { Loi("Chỉ nhận ảnh .jpg, .png, .webp, .svg."); return RedirectToAction(nameof(Details), new { id = maSP }); }
            if (file.Length > 2 * 1024 * 1024) { Loi("Ảnh tối đa 2 MB."); return RedirectToAction(nameof(Details), new { id = maSP }); }
            var dir = Path.Combine(_env.WebRootPath, "uploads");
            Directory.CreateDirectory(dir);
            var name = Guid.NewGuid().ToString("N") + ext;
            await using (var fs = System.IO.File.Create(Path.Combine(dir, name))) await file.CopyToAsync(fs);
            path = "/uploads/" + name;
        }
        else if (!string.IsNullOrWhiteSpace(url))
        {
            url = url.Trim();
            if (!(url.StartsWith("http://") || url.StartsWith("https://") || url.StartsWith("/"))) { Loi("Đường dẫn ảnh phải bắt đầu bằng http://, https:// hoặc /"); return RedirectToAction(nameof(Details), new { id = maSP }); }
            path = url;
        }
        if (path == null) { Loi("Hãy chọn tệp ảnh hoặc nhập đường dẫn ảnh."); return RedirectToAction(nameof(Details), new { id = maSP }); }
        var sp = await _db.SanPhams.Include(s => s.Anhs).FirstAsync(s => s.MaSP == maSP);
        if (sp.Anhs.Count >= 8) { Loi("Mỗi sản phẩm tối đa 8 ảnh."); return RedirectToAction(nameof(Details), new { id = maSP }); }
        _db.AnhSanPhams.Add(new AnhSanPham { MaSP = maSP, MaMau = maMau, DuongDan = path, ThuTu = sp.Anhs.Count });
        if (string.IsNullOrEmpty(sp.AnhDaiDien)) sp.AnhDaiDien = path;
        await _db.SaveChangesAsync();
        ThongBao("Đã thêm ảnh.");
        return RedirectToAction(nameof(Details), new { id = maSP });
    }

    [Authorize(Roles = Const.ROLE_ADMIN), HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> MainImage(int maAnh)
    {
        var a = await _db.AnhSanPhams.FirstOrDefaultAsync(x => x.MaAnh == maAnh);
        if (a == null) return NotFound();
        var sp = await _db.SanPhams.FirstAsync(s => s.MaSP == a.MaSP);
        sp.AnhDaiDien = a.DuongDan;
        await _db.SaveChangesAsync();
        ThongBao("Đã đặt làm ảnh đại diện.");
        return RedirectToAction(nameof(Details), new { id = a.MaSP });
    }

    [Authorize(Roles = Const.ROLE_ADMIN), HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteImage(int maAnh)
    {
        var a = await _db.AnhSanPhams.FirstOrDefaultAsync(x => x.MaAnh == maAnh);
        if (a == null) return NotFound();
        var sp = await _db.SanPhams.FirstAsync(s => s.MaSP == a.MaSP);
        _db.AnhSanPhams.Remove(a);
        if (sp.AnhDaiDien == a.DuongDan)
        {
            var con = await _db.AnhSanPhams.Where(x => x.MaSP == a.MaSP && x.MaAnh != a.MaAnh).OrderBy(x => x.ThuTu).FirstOrDefaultAsync();
            sp.AnhDaiDien = con?.DuongDan;
        }
        await _db.SaveChangesAsync();
        ThongBao("Đã xóa ảnh.");
        return RedirectToAction(nameof(Details), new { id = a.MaSP });
    }
}
