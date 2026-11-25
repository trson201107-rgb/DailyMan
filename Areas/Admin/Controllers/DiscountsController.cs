using DailyMan.Data;
using DailyMan.Helpers;
using DailyMan.Models;
using DailyMan.Services;
using DailyMan.ViewModels;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DailyMan.Areas.Admin.Controllers;

/// <summary>
/// Quản lý mã giảm giá cho QUẢN TRỊ và NHÂN VIÊN, tách thành 3 loại theo yêu cầu của thầy:
///   Sự kiện (Event) · Combo · Cấp bậc tài khoản (Tier).
/// Cả hai vai trò đều được thêm / sửa / bật-tắt mã; chỉ Admin được xóa mã và chỉnh bảng hạng thành viên.
/// </summary>
public class DiscountsController : AdminBaseController
{
    private readonly AppDbContext _db;
    private readonly ConfigService _cfg;
    private readonly TierService _tier;
    public DiscountsController(AppDbContext db, ConfigService cfg, TierService tier) { _db = db; _cfg = cfg; _tier = tier; }

    public IActionResult Index() => RedirectToAction(nameof(Event));

    private async Task<IActionResult> ListAsync(string loai, string? q, string? tinhTrang, int page)
    {
        var query = _db.Vouchers.AsNoTracking().Where(v => v.LoaiKM == loai);
        if (!string.IsNullOrWhiteSpace(q)) { var k = q.Trim(); query = query.Where(v => v.MaCode.Contains(k) || v.TenChuongTrinh.Contains(k)); }
        var today = DateTime.Today;
        query = tinhTrang switch
        {
            "chay" => query.Where(v => v.DangBat && v.NgayBatDau <= today && v.NgayHetHan >= today && v.SoLuotConLai > 0),
            "tat" => query.Where(v => !v.DangBat),
            "het" => query.Where(v => v.NgayHetHan < today || v.SoLuotConLai <= 0),
            "sap" => query.Where(v => v.NgayBatDau > today),
            _ => query
        };
        ViewBag.Loai = loai; ViewBag.Q = q; ViewBag.TinhTrang = tinhTrang;
        ViewBag.DanhMucs = await _db.DanhMucs.AsNoTracking().ToDictionaryAsync(d => d.MaDM, d => d.TenDM);
        ViewBag.Hangs = await _db.HangThanhViens.AsNoTracking().ToDictionaryAsync(h => h.MaHang, h => h.TenHang);
        ViewBag.DaDung = await _db.DonHangs.Where(d => d.MaVoucher != null && d.MaTrangThai != Const.HUY).GroupBy(d => d.MaVoucher!.Value).Select(g => new { g.Key, N = g.Count() }).ToDictionaryAsync(x => x.Key, x => x.N);
        var list = await PagedList<Voucher>.CreateAsync(query.OrderByDescending(v => v.NgayHetHan), page, Const.ADMIN_PAGE_SIZE);
        return View("List", list);
    }

    public Task<IActionResult> Event(string? q, string? tinhTrang, int page = 1) => ListAsync(Const.KM_SU_KIEN, q, tinhTrang, page);
    public Task<IActionResult> Combo(string? q, string? tinhTrang, int page = 1) => ListAsync(Const.KM_COMBO, q, tinhTrang, page);

    /// <summary>Trang giảm giá theo cấp bậc: bảng hạng + ưu đãi tự động + các mã dành riêng theo hạng.</summary>
    public async Task<IActionResult> Tier(string? q, string? tinhTrang, int page = 1)
    {
        ViewBag.Hangs2 = await _db.HangThanhViens.AsNoTracking().OrderBy(h => h.ChiTieuToiThieu).ToListAsync();
        ViewBag.SoKhach = await _db.TaiKhoans.Where(t => t.MaHang != null).GroupBy(t => t.MaHang!.Value).Select(g => new { g.Key, N = g.Count() }).ToDictionaryAsync(x => x.Key, x => x.N);
        ViewBag.AutoBat = await _tier.EnabledAsync();
        return await ListAsync(Const.KM_CAP_BAC, q, tinhTrang, page);
    }

    // ---------- Thêm / sửa mã ----------
    private async Task LoadListsAsync()
    {
        ViewBag.DanhMucs = await _db.DanhMucs.AsNoTracking().OrderBy(d => d.MaDM).ToListAsync();
        ViewBag.Hangs = await _db.HangThanhViens.AsNoTracking().OrderBy(h => h.ChiTieuToiThieu).ToListAsync();
    }

    [HttpGet]
    public async Task<IActionResult> Form(int? id, string? loai)
    {
        await LoadListsAsync();
        if (id == null)
        {
            var l = loai is Const.KM_COMBO or Const.KM_CAP_BAC ? loai : Const.KM_SU_KIEN;
            return View(new VoucherFormVm { LoaiKM = l, SoLuong1 = l == Const.KM_COMBO ? 2 : null });
        }
        var v = await _db.Vouchers.AsNoTracking().FirstOrDefaultAsync(x => x.MaVoucher == id);
        if (v == null) return NotFound();
        return View(new VoucherFormVm
        {
            MaVoucher = v.MaVoucher, LoaiKM = v.LoaiKM, MaCode = v.MaCode, TenChuongTrinh = v.TenChuongTrinh, LoaiGiam = v.LoaiGiam, GiaTriGiam = v.GiaTriGiam,
            GiamToiDa = v.GiamToiDa, DonToiThieu = v.DonToiThieu, SoLuotConLai = v.SoLuotConLai, NgayBatDau = v.NgayBatDau, NgayHetHan = v.NgayHetHan, DangBat = v.DangBat,
            MaDM1 = v.MaDM1, SoLuong1 = v.SoLuong1, MaDM2 = v.MaDM2, SoLuong2 = v.SoLuong2, MaHangToiThieu = v.MaHangToiThieu,
            DaDung = await _db.DonHangs.AnyAsync(d => d.MaVoucher == v.MaVoucher)
        });
    }

    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Form(VoucherFormVm vm)
    {
        vm.MaCode = VoucherService.Chuan(vm.MaCode);
        if (!System.Text.RegularExpressions.Regex.IsMatch(vm.MaCode, "^[A-Z0-9_]+$")) ModelState.AddModelError(nameof(vm.MaCode), "Mã chỉ gồm chữ không dấu, số và dấu gạch dưới.");
        if (await _db.Vouchers.AnyAsync(v => v.MaCode == vm.MaCode && v.MaVoucher != vm.MaVoucher)) ModelState.AddModelError(nameof(vm.MaCode), "Mã này đã tồn tại.");
        if (vm.LoaiGiam == Const.GIAM_PHAN_TRAM && vm.GiaTriGiam > 100) ModelState.AddModelError(nameof(vm.GiaTriGiam), "Giảm theo % tối đa là 100.");
        if (vm.NgayHetHan.Date < vm.NgayBatDau.Date) ModelState.AddModelError(nameof(vm.NgayHetHan), "Ngày kết thúc phải sau ngày bắt đầu.");
        if (vm.LoaiKM == Const.KM_COMBO)
        {
            if (vm.SoLuong1 is null or < 1) ModelState.AddModelError(nameof(vm.SoLuong1), "Combo cần ít nhất 1 sản phẩm ở nhóm 1.");
            if (vm.MaDM2 != null && vm.SoLuong2 is null or < 1) ModelState.AddModelError(nameof(vm.SoLuong2), "Nhập số sản phẩm tối thiểu của nhóm 2.");
        }
        if (vm.LoaiKM == Const.KM_CAP_BAC && vm.MaHangToiThieu == null) ModelState.AddModelError(nameof(vm.MaHangToiThieu), "Chọn hạng thấp nhất được dùng mã.");
        if (!ModelState.IsValid) { await LoadListsAsync(); return View(vm); }

        Voucher v;
        if (vm.MaVoucher == 0) { v = new Voucher { LoaiKM = vm.LoaiKM }; _db.Vouchers.Add(v); }
        else
        {
            v = await _db.Vouchers.FirstAsync(x => x.MaVoucher == vm.MaVoucher);
            if (await _db.DonHangs.AnyAsync(d => d.MaVoucher == v.MaVoucher) && v.MaCode != vm.MaCode) { ModelState.AddModelError(nameof(vm.MaCode), "Mã đã có đơn sử dụng nên không đổi tên mã được."); await LoadListsAsync(); vm.DaDung = true; return View(vm); }
        }
        v.MaCode = vm.MaCode; v.TenChuongTrinh = vm.TenChuongTrinh.Trim(); v.LoaiGiam = vm.LoaiGiam; v.GiaTriGiam = vm.GiaTriGiam;
        v.GiamToiDa = vm.LoaiGiam == Const.GIAM_PHAN_TRAM && vm.GiamToiDa is > 0 ? vm.GiamToiDa : null;
        v.DonToiThieu = vm.DonToiThieu; v.SoLuotConLai = vm.SoLuotConLai; v.NgayBatDau = vm.NgayBatDau.Date; v.NgayHetHan = vm.NgayHetHan.Date; v.DangBat = vm.DangBat;
        v.MaDM1 = vm.LoaiKM == Const.KM_COMBO ? vm.MaDM1 : null;
        v.SoLuong1 = vm.LoaiKM == Const.KM_COMBO ? vm.SoLuong1 : null;
        v.MaDM2 = vm.LoaiKM == Const.KM_COMBO ? vm.MaDM2 : null;
        v.SoLuong2 = vm.LoaiKM == Const.KM_COMBO && vm.MaDM2 != null ? vm.SoLuong2 : null;
        v.MaHangToiThieu = vm.LoaiKM == Const.KM_CAP_BAC ? vm.MaHangToiThieu : null;
        await _db.SaveChangesAsync();
        ThongBao($"Đã lưu mã {v.MaCode}.");
        return RedirectToAction(TenTrang(v.LoaiKM));
    }

    private static string TenTrang(string loai) => loai == Const.KM_COMBO ? nameof(Combo) : loai == Const.KM_CAP_BAC ? nameof(Tier) : nameof(Event);

    /// <summary>Bật / tạm tắt một mã (cả nhân viên cũng làm được).</summary>
    [HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Toggle(int id)
    {
        var v = await _db.Vouchers.FirstOrDefaultAsync(x => x.MaVoucher == id);
        if (v == null) return NotFound();
        v.DangBat = !v.DangBat;
        await _db.SaveChangesAsync();
        ThongBao($"Mã {v.MaCode} đã {(v.DangBat ? "được bật" : "tạm tắt")}.");
        return RedirectToAction(TenTrang(v.LoaiKM));
    }

    [Authorize(Roles = Const.ROLE_ADMIN), HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> Delete(int id)
    {
        var v = await _db.Vouchers.FirstOrDefaultAsync(x => x.MaVoucher == id);
        if (v == null) return NotFound();
        if (await _db.DonHangs.AnyAsync(d => d.MaVoucher == id)) { Loi("Mã đã có đơn hàng sử dụng nên không thể xóa. Hãy tạm tắt mã."); return RedirectToAction(TenTrang(v.LoaiKM)); }
        _db.Vouchers.Remove(v);
        await _db.SaveChangesAsync();
        ThongBao("Đã xóa mã.");
        return RedirectToAction(TenTrang(v.LoaiKM));
    }

    // ---------- Hạng thành viên (ưu đãi tự động theo cấp bậc) ----------
    [Authorize(Roles = Const.ROLE_ADMIN), HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> SaveTier(int maHang, int phanTram, decimal chiTieu)
    {
        if (phanTram is < 0 or > 50) { Loi("Ưu đãi hạng phải từ 0 đến 50%."); return RedirectToAction(nameof(Tier)); }
        if (chiTieu < 0) { Loi("Chi tiêu tối thiểu không được âm."); return RedirectToAction(nameof(Tier)); }
        var h = await _db.HangThanhViens.FirstOrDefaultAsync(x => x.MaHang == maHang);
        if (h == null) return NotFound();
        if (await _db.HangThanhViens.AnyAsync(x => x.MaHang != maHang && x.ChiTieuToiThieu == chiTieu)) { Loi("Đã có hạng khác dùng đúng mức chi tiêu này."); return RedirectToAction(nameof(Tier)); }
        h.PhanTramUuDai = phanTram; h.ChiTieuToiThieu = chiTieu;
        await _db.SaveChangesAsync();
        await _tier.RecomputeAllAsync();
        ThongBao($"Đã cập nhật hạng {h.TenHang} và tính lại hạng của khách hàng.");
        return RedirectToAction(nameof(Tier));
    }

    [Authorize(Roles = Const.ROLE_ADMIN), HttpPost, ValidateAntiForgeryToken]
    public async Task<IActionResult> ToggleAuto()
    {
        var bat = await _tier.EnabledAsync();
        await _cfg.SetAsync(Const.CFG_UU_DAI_HANG, bat ? "0" : "1");
        ThongBao(bat ? "Đã tắt ưu đãi tự động theo hạng thành viên." : "Đã bật ưu đãi tự động theo hạng thành viên.");
        return RedirectToAction(nameof(Tier));
    }
}
