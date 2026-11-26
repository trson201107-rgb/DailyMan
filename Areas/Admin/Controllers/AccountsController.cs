using DailyMan.Data;
using DailyMan.Helpers;
using DailyMan.Models;
using DailyMan.Services;
using DailyMan.ViewModels;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DailyMan.Areas.Admin.Controllers;

/// <summary>
/// Quản lý tài khoản, tách thành 3 nhóm: Quản trị viên · Nhân viên · Khách hàng.
/// Nhân viên chỉ được xem danh sách / chi tiết khách hàng; mọi thao tác còn lại thuộc về Admin.
/// </summary>
public class AccountsController : AdminBaseController
{
    private readonly AppDbContext _db;
    private readonly TierService _tier;
    private readonly PasswordHasher<TaiKhoan> _hasher = new();
    public AccountsController(AppDbContext db, TierService tier) { _db = db; _tier = tier; }

    public IActionResult Index() => User.IsAdmin() ? RedirectToAction(nameof(Admins)) : RedirectToAction(nameof(Customers));

    private async Task<IActionResult> ListAsync(string role, string? q, string? tt, int? hang, int page)
    {
        var query = _db.TaiKhoans.AsNoTracking().Include(t => t.HangThanhVien).Where(t => t.VaiTro!.TenVaiTro == role);
        if (!string.IsNullOrWhiteSpace(q)) { var k = q.Trim(); query = query.Where(t => t.HoTen.ToLower().Contains(k.ToLower()) || t.Email.ToLower().Contains(k.ToLower()) || t.SoDienThoai.ToLower().Contains(k.ToLower())); }
        if (!string.IsNullOrEmpty(tt)) query = query.Where(t => t.TrangThai == tt);
        if (hang.HasValue) query = query.Where(t => t.MaHang == hang);
        ViewBag.Role = role; ViewBag.Q = q; ViewBag.Tt = tt; ViewBag.Hang = hang;
        ViewBag.Hangs = await _db.HangThanhViens.AsNoTracking().OrderBy(h => h.ChiTieuToiThieu).ToListAsync();
        var list = await PagedList<TaiKhoan>.CreateAsync(query.OrderByDescending(t => t.NgayTao), page, Const.ADMIN_PAGE_SIZE);
        if (role == Const.ROLE_CUSTOMER)
        {
            var ids = list.Items.Select(t => t.MaTK).ToList();
            ViewBag.ChiTieu = await (from d in _db.DonHangs join p in _db.ThanhToans on d.MaDH equals p.MaDH where ids.Contains(d.MaTK) && d.MaTrangThai == Const.HOAN_THANH select new { d.MaTK, p.SoTien })
                .GroupBy(x => x.MaTK).Select(g => new { g.Key, Tong = g.Sum(x => x.SoTien) }).ToDictionaryAsync(x => x.Key, x => x.Tong);
        }
        return View("List", list);
    }

    [Authorize(Roles = Const.ROLE_ADMIN)] public Task<IActionResult> Admins(string? q, string? tt, int page = 1) => ListAsync(Const.ROLE_ADMIN, q, tt, null, page);
    [Authorize(Roles = Const.ROLE_ADMIN)] public Task<IActionResult> Staffs(string? q, string? tt, int page = 1) => ListAsync(Const.ROLE_STAFF, q, tt, null, page);
    public Task<IActionResult> Customers(string? q, string? tt, int? hang, int page = 1) => ListAsync(Const.ROLE_CUSTOMER, q, tt, hang, page);

    public async Task<IActionResult> CustomerDetail(int id)
    {
        var tk = await _db.TaiKhoans.AsNoTracking().Include(t => t.HangThanhVien).Include(t => t.VaiTro).FirstOrDefaultAsync(t => t.MaTK == id && t.VaiTro!.TenVaiTro == Const.ROLE_CUSTOMER);
        if (tk == null) return NotFound();
        ViewBag.ChiTieu = await _tier.ChiTieuAsync(id);
        ViewBag.Dons = await _db.DonHangs.AsNoTracking().Include(d => d.TrangThai).Include(d => d.ThanhToan).Where(d => d.MaTK == id).OrderByDescending(d => d.NgayDat).Take(20).ToListAsync();
        ViewBag.DiaChis = await _db.DiaChis.AsNoTracking().Where(d => d.MaTK == id).ToListAsync();
        return View(tk);
    }

    // ---------- Thêm / sửa (Admin) ----------
    [Authorize(Roles = Const.ROLE_ADMIN), HttpGet]
    public async Task<IActionResult> Form(int? id, string? role)
    {
        if (id == null) return View(new AccountFormVm { Role = role == Const.ROLE_ADMIN ? Const.ROLE_ADMIN : Const.ROLE_STAFF });
        var t = await _db.TaiKhoans.AsNoTracking().Include(x => x.VaiTro).FirstOrDefaultAsync(x => x.MaTK == id && x.VaiTro!.TenVaiTro != Const.ROLE_CUSTOMER);
        if (t == null) return NotFound();
        return View(new AccountFormVm { MaTK = t.MaTK, HoTen = t.HoTen, Email = t.Email, SoDienThoai = t.SoDienThoai, Role = t.VaiTro!.TenVaiTro });
    }

    [Authorize(Roles = Const.ROLE_ADMIN), HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Form(AccountFormVm vm)
    {
        vm.Email = vm.Email.Trim().ToLowerInvariant();
        if (vm.Role != Const.ROLE_ADMIN && vm.Role != Const.ROLE_STAFF) ModelState.AddModelError(nameof(vm.Role), "Vai trò không hợp lệ.");
        if (vm.MaTK == 0 && string.IsNullOrWhiteSpace(vm.MatKhau)) ModelState.AddModelError(nameof(vm.MatKhau), "Nhập mật khẩu cho tài khoản mới.");
        if (await _db.TaiKhoans.AnyAsync(t => t.Email == vm.Email && t.MaTK != vm.MaTK)) ModelState.AddModelError(nameof(vm.Email), "Email đã được dùng.");
        if (await _db.TaiKhoans.AnyAsync(t => t.SoDienThoai == vm.SoDienThoai && t.MaTK != vm.MaTK)) ModelState.AddModelError(nameof(vm.SoDienThoai), "Số điện thoại đã được dùng.");
        if (!ModelState.IsValid) return View(vm);

        var role = await _db.VaiTros.FirstAsync(v => v.TenVaiTro == vm.Role);
        TaiKhoan t;
        if (vm.MaTK == 0) { t = new TaiKhoan(); _db.TaiKhoans.Add(t); t.MatKhauHash = _hasher.HashPassword(t, vm.MatKhau!); }
        else
        {
            t = await _db.TaiKhoans.Include(x => x.VaiTro).FirstAsync(x => x.MaTK == vm.MaTK);
            // không cho hạ quyền người Admin cuối cùng
            if (t.VaiTro!.TenVaiTro == Const.ROLE_ADMIN && vm.Role != Const.ROLE_ADMIN && await _db.TaiKhoans.CountAsync(x => x.VaiTro!.TenVaiTro == Const.ROLE_ADMIN && x.TrangThai == Const.TK_HOAT_DONG) <= 1)
            { ModelState.AddModelError(nameof(vm.Role), "Hệ thống phải còn ít nhất 1 quản trị viên đang hoạt động."); return View(vm); }
        }
        t.HoTen = vm.HoTen.Trim(); t.Email = vm.Email; t.SoDienThoai = vm.SoDienThoai; t.MaVaiTro = role.MaVaiTro;
        await _db.SaveChangesAsync();
        ThongBao("Đã lưu tài khoản.");
        return RedirectToAction(vm.Role == Const.ROLE_ADMIN ? nameof(Admins) : nameof(Staffs));
    }

    [Authorize(Roles = Const.ROLE_ADMIN), HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> ToggleLock(int id, string? back)
    {
        var t = await _db.TaiKhoans.Include(x => x.VaiTro).FirstOrDefaultAsync(x => x.MaTK == id);
        if (t == null) return NotFound();
        var dich = BackAction(t.VaiTro!.TenVaiTro);
        if (t.MaTK == User.UserId()) { Loi("Bạn không thể tự khóa tài khoản của mình."); return RedirectToAction(dich); }
        if (t.TrangThai == Const.TK_HOAT_DONG)
        {
            if (t.VaiTro.TenVaiTro == Const.ROLE_ADMIN && await _db.TaiKhoans.CountAsync(x => x.VaiTro!.TenVaiTro == Const.ROLE_ADMIN && x.TrangThai == Const.TK_HOAT_DONG) <= 1)
            { Loi("Không thể khóa quản trị viên cuối cùng."); return RedirectToAction(dich); }
            t.TrangThai = Const.TK_KHOA;
        }
        else { t.TrangThai = Const.TK_HOAT_DONG; t.SoLanDangNhapSai = 0; t.KhoaDen = null; }
        await _db.SaveChangesAsync();
        ThongBao($"Tài khoản {t.HoTen}: {t.TrangThai}.");
        return RedirectToAction(dich);
    }

    private static string BackAction(string role) => role == Const.ROLE_ADMIN ? nameof(Admins) : role == Const.ROLE_STAFF ? nameof(Staffs) : nameof(Customers);

    [Authorize(Roles = Const.ROLE_ADMIN), HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> ResetPassword(int id, string? matKhauMoi)
    {
        var t = await _db.TaiKhoans.Include(x => x.VaiTro).FirstOrDefaultAsync(x => x.MaTK == id);
        if (t == null) return NotFound();
        if (string.IsNullOrWhiteSpace(matKhauMoi) || matKhauMoi.Length < 6) { Loi("Mật khẩu mới tối thiểu 6 ký tự."); return RedirectToAction(BackAction(t.VaiTro!.TenVaiTro)); }
        t.MatKhauHash = _hasher.HashPassword(t, matKhauMoi);
        t.SoLanDangNhapSai = 0; t.KhoaDen = null;
        await _db.SaveChangesAsync();
        ThongBao($"Đã đặt lại mật khẩu cho {t.HoTen}.");
        return RedirectToAction(BackAction(t.VaiTro!.TenVaiTro));
    }
}
