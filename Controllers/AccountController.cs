using System.Security.Claims;
using DailyMan.Data;
using DailyMan.Helpers;
using DailyMan.Models;
using DailyMan.ViewModels;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DailyMan.Controllers;

public class AccountController : BaseController
{
    private readonly AppDbContext _db;
    private readonly PasswordHasher<TaiKhoan> _hasher = new();
    public AccountController(AppDbContext db) => _db = db;

    // ---------- Đăng nhập ----------
    [HttpGet]
    public IActionResult Login(string? returnUrl) => User.Identity?.IsAuthenticated == true ? RedirectToAction("Index", "Home") : View(new LoginVm { ReturnUrl = returnUrl });

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Login(LoginVm vm)
    {
        if (!ModelState.IsValid) return View(vm);
        var key = vm.TaiKhoan.Trim();
        var tk = await _db.TaiKhoans.Include(t => t.VaiTro).FirstOrDefaultAsync(t => t.Email == key || t.SoDienThoai == key);
        if (tk == null) { ModelState.AddModelError("", "Sai tài khoản hoặc mật khẩu."); return View(vm); }

        if (tk.KhoaDen.HasValue && tk.KhoaDen > DateTime.Now)
        {
            ModelState.AddModelError("", $"Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau {Math.Ceiling((tk.KhoaDen.Value - DateTime.Now).TotalMinutes)} phút.");
            return View(vm);
        }
        var kq = _hasher.VerifyHashedPassword(tk, tk.MatKhauHash, vm.MatKhau);
        if (kq == PasswordVerificationResult.Failed)
        {
            tk.SoLanDangNhapSai++;
            if (tk.SoLanDangNhapSai >= Const.MAX_LOGIN_FAIL) { tk.KhoaDen = DateTime.Now.AddMinutes(Const.LOCK_MINUTES); tk.SoLanDangNhapSai = 0; }
            await _db.SaveChangesAsync();
            ModelState.AddModelError("", "Sai tài khoản hoặc mật khẩu.");
            return View(vm);
        }
        if (tk.TrangThai != Const.TK_HOAT_DONG) { ModelState.AddModelError("", "Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên."); return View(vm); }

        tk.SoLanDangNhapSai = 0; tk.KhoaDen = null;
        await _db.SaveChangesAsync();
        await SignInAsync(tk, vm.GhiNho);

        if (!string.IsNullOrEmpty(vm.ReturnUrl) && Url.IsLocalUrl(vm.ReturnUrl)) return Redirect(vm.ReturnUrl);
        return tk.VaiTro!.TenVaiTro == Const.ROLE_CUSTOMER ? RedirectToAction("Index", "Home") : RedirectToAction("Index", "Dashboard", new { area = "Admin" });
    }

    private async Task SignInAsync(TaiKhoan tk, bool ghiNho)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, tk.MaTK.ToString()),
            new(ClaimTypes.Name, tk.HoTen),
            new(ClaimTypes.Role, tk.VaiTro!.TenVaiTro)
        };
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme));
        await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal,
            new AuthenticationProperties { IsPersistent = ghiNho, ExpiresUtc = DateTimeOffset.UtcNow.AddDays(ghiNho ? 30 : 1) });
    }

    // ---------- Đăng ký ----------
    [HttpGet] public IActionResult Register() => View(new RegisterVm());

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Register(RegisterVm vm)
    {
        if (!ModelState.IsValid) return View(vm);
        var email = vm.Email.Trim().ToLowerInvariant();
        if (await _db.TaiKhoans.AnyAsync(t => t.Email == email)) ModelState.AddModelError(nameof(vm.Email), "Email này đã được đăng ký.");
        if (await _db.TaiKhoans.AnyAsync(t => t.SoDienThoai == vm.SoDienThoai)) ModelState.AddModelError(nameof(vm.SoDienThoai), "Số điện thoại này đã được đăng ký.");
        if (!ModelState.IsValid) return View(vm);

        var roleKh = await _db.VaiTros.FirstAsync(v => v.TenVaiTro == Const.ROLE_CUSTOMER);
        var hangThap = await _db.HangThanhViens.OrderBy(h => h.ChiTieuToiThieu).FirstOrDefaultAsync();
        var tk = new TaiKhoan { HoTen = vm.HoTen.Trim(), Email = email, SoDienThoai = vm.SoDienThoai, MaVaiTro = roleKh.MaVaiTro, MaHang = hangThap?.MaHang };
        tk.MatKhauHash = _hasher.HashPassword(tk, vm.MatKhau);
        _db.TaiKhoans.Add(tk);
        await _db.SaveChangesAsync();
        tk.VaiTro = roleKh;
        await SignInAsync(tk, false);
        ThongBao("Đăng ký thành công! Chào mừng bạn đến với dailyman.");
        return RedirectToAction("Index", "Home");
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return RedirectToAction("Index", "Home");
    }

    public IActionResult AccessDenied() => View();

    // ---------- Hồ sơ ----------
    [Authorize]
    public async Task<IActionResult> Profile()
    {
        var tk = await _db.TaiKhoans.Include(t => t.HangThanhVien).AsNoTracking().FirstAsync(t => t.MaTK == User.UserId());
        ViewBag.Tk = tk;
        return View(new ProfileVm { HoTen = tk.HoTen, SoDienThoai = tk.SoDienThoai });
    }

    [Authorize, HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Profile(ProfileVm vm)
    {
        var tk = await _db.TaiKhoans.Include(t => t.HangThanhVien).FirstAsync(t => t.MaTK == User.UserId());
        ViewBag.Tk = tk;
        if (await _db.TaiKhoans.AnyAsync(t => t.SoDienThoai == vm.SoDienThoai && t.MaTK != tk.MaTK)) ModelState.AddModelError(nameof(vm.SoDienThoai), "Số điện thoại đã được dùng bởi tài khoản khác.");
        if (!ModelState.IsValid) return View(vm);
        tk.HoTen = vm.HoTen.Trim(); tk.SoDienThoai = vm.SoDienThoai;
        await _db.SaveChangesAsync();
        ThongBao("Đã cập nhật hồ sơ. Đăng nhập lại để thấy tên mới trên thanh menu.");
        return RedirectToAction(nameof(Profile));
    }

    [Authorize, HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> ChangePassword(ChangePasswordVm vm)
    {
        if (!ModelState.IsValid) { Loi(string.Join(" ", ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage))); return RedirectToAction(nameof(Profile)); }
        var tk = await _db.TaiKhoans.FirstAsync(t => t.MaTK == User.UserId());
        if (_hasher.VerifyHashedPassword(tk, tk.MatKhauHash, vm.MatKhauCu) == PasswordVerificationResult.Failed) { Loi("Mật khẩu hiện tại không đúng."); return RedirectToAction(nameof(Profile)); }
        tk.MatKhauHash = _hasher.HashPassword(tk, vm.MatKhauMoi);
        await _db.SaveChangesAsync();
        ThongBao("Đã đổi mật khẩu.");
        return RedirectToAction(nameof(Profile));
    }

    // ---------- Sổ địa chỉ ----------
    [Authorize]
    public async Task<IActionResult> Addresses() =>
        View(await _db.DiaChis.AsNoTracking().Where(d => d.MaTK == User.UserId()).OrderByDescending(d => d.MacDinh).ThenByDescending(d => d.MaDC).ToListAsync());

    [Authorize, HttpGet]
    public async Task<IActionResult> AddressForm(int? id)
    {
        if (id == null) return View(new AddressVm { TenNguoiNhan = User.UserName() });
        var d = await _db.DiaChis.AsNoTracking().FirstOrDefaultAsync(x => x.MaDC == id && x.MaTK == User.UserId());
        if (d == null) return NotFound();
        return View(new AddressVm { MaDC = d.MaDC, TenNguoiNhan = d.TenNguoiNhan, SDT = d.SDT, TinhThanh = d.TinhThanh, QuanHuyen = d.QuanHuyen, DiaChiCuThe = d.DiaChiCuThe, MacDinh = d.MacDinh });
    }

    [Authorize, HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> AddressForm(AddressVm vm)
    {
        if (!ModelState.IsValid) return View(vm);
        var maTK = User.UserId();
        DiaChi? d;
        if (vm.MaDC == 0)
        {
            d = new DiaChi { MaTK = maTK };
            _db.DiaChis.Add(d);
            if (!await _db.DiaChis.AnyAsync(x => x.MaTK == maTK)) vm.MacDinh = true;     // địa chỉ đầu tiên tự là mặc định
        }
        else
        {
            d = await _db.DiaChis.FirstOrDefaultAsync(x => x.MaDC == vm.MaDC && x.MaTK == maTK);
            if (d == null) return NotFound();
        }
        d.TenNguoiNhan = vm.TenNguoiNhan.Trim(); d.SDT = vm.SDT; d.TinhThanh = vm.TinhThanh.Trim(); d.QuanHuyen = vm.QuanHuyen.Trim(); d.DiaChiCuThe = vm.DiaChiCuThe.Trim();
        if (vm.MacDinh)
        {
            foreach (var x in await _db.DiaChis.Where(x => x.MaTK == maTK && x.MaDC != vm.MaDC).ToListAsync()) x.MacDinh = false;
            d.MacDinh = true;
        }
        await _db.SaveChangesAsync();
        ThongBao("Đã lưu địa chỉ.");
        return RedirectToAction(nameof(Addresses));
    }

    [Authorize, HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> DeleteAddress(int id)
    {
        var d = await _db.DiaChis.FirstOrDefaultAsync(x => x.MaDC == id && x.MaTK == User.UserId());
        if (d != null) { _db.DiaChis.Remove(d); await _db.SaveChangesAsync(); ThongBao("Đã xóa địa chỉ."); }
        return RedirectToAction(nameof(Addresses));
    }

    [Authorize, HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> DefaultAddress(int id)
    {
        var maTK = User.UserId();
        var all = await _db.DiaChis.Where(x => x.MaTK == maTK).ToListAsync();
        foreach (var x in all) x.MacDinh = x.MaDC == id;
        await _db.SaveChangesAsync();
        return RedirectToAction(nameof(Addresses));
    }
}
