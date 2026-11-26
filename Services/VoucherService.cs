using DailyMan.Data;
using DailyMan.Helpers;
using DailyMan.Models;
using DailyMan.ViewModels;
using Microsoft.EntityFrameworkCore;

namespace DailyMan.Services;

/// <summary>
/// Kiểm tra và tính tiền giảm của mã giảm giá. Áp dụng 3 loại: sự kiện, combo, cấp bậc tài khoản.
/// Mỗi khách chỉ được dùng 1 mã đúng 1 lần (đơn đã hủy thì được dùng lại).
/// </summary>
public class VoucherService
{
    private readonly AppDbContext _db;
    public VoucherService(AppDbContext db) => _db = db;

    public static string Chuan(string? code) => (code ?? "").Trim().ToUpperInvariant();

    public async Task<Voucher?> FindByCodeAsync(string? code)
    {
        var c = Chuan(code);
        return await _db.Vouchers.FirstOrDefaultAsync(v => v.MaCode == c);
    }

    /// <summary>Kiểm tra mã với giỏ hàng. Trả về (dùng được?, lý do nếu không, số tiền giảm).</summary>
    public async Task<(bool Ok, string? Loi, decimal Giam)> EvaluateAsync(Voucher v, int maTK, List<CartLineVm> lines)
    {
        var tienHang = lines.Sum(l => l.ThanhTien);
        if (!v.DangBat) return (false, "Mã đang tạm tắt.", 0);
        if (DateTime.Today < v.NgayBatDau.Date) return (false, $"Mã áp dụng từ {Fmt.Date(v.NgayBatDau)}.", 0);
        if (DateTime.Today > v.NgayHetHan.Date) return (false, "Mã đã hết hạn.", 0);
        if (v.SoLuotConLai <= 0) return (false, "Mã đã hết lượt sử dụng.", 0);
        var daDung = await _db.DonHangs.AnyAsync(d => d.MaTK == maTK && d.MaVoucher == v.MaVoucher && d.MaTrangThai != Const.HUY);
        if (daDung) return (false, "Bạn đã sử dụng mã này rồi.", 0);
        if (tienHang < v.DonToiThieu) return (false, $"Chỉ áp dụng cho đơn từ {Fmt.Money(v.DonToiThieu)}.", 0);

        decimal coSo = tienHang;       // số tiền làm căn cứ tính giảm

        if (v.LoaiKM == Const.KM_CAP_BAC)
        {
            var tk = await _db.TaiKhoans.AsNoTracking().Include(t => t.HangThanhVien).FirstOrDefaultAsync(t => t.MaTK == maTK);
            var yeuCau = await _db.HangThanhViens.AsNoTracking().FirstOrDefaultAsync(h => h.MaHang == v.MaHangToiThieu);
            if (yeuCau != null && (tk?.HangThanhVien == null || tk.HangThanhVien.ChiTieuToiThieu < yeuCau.ChiTieuToiThieu))
                return (false, $"Mã dành cho thành viên hạng {yeuCau.TenHang} trở lên.", 0);
        }
        else if (v.LoaiKM == Const.KM_COMBO)
        {
            var tenDM = await _db.DanhMucs.AsNoTracking().ToDictionaryAsync(d => d.MaDM, d => d.TenDM);
            string Ten(int? ma) => ma.HasValue && tenDM.TryGetValue(ma.Value, out var t) ? t : "bất kỳ";

            if (v.SoLuong1 is > 0)
            {
                var sl1 = lines.Where(l => v.MaDM1 == null || l.MaDM == v.MaDM1).Sum(l => l.SoLuong);
                if (sl1 < v.SoLuong1) return (false, $"Combo cần mua ít nhất {v.SoLuong1} sản phẩm thuộc nhóm \"{Ten(v.MaDM1)}\".", 0);
            }
            if (v.MaDM2 != null && v.SoLuong2 is > 0)
            {
                var sl2 = lines.Where(l => l.MaDM == v.MaDM2).Sum(l => l.SoLuong);
                if (sl2 < v.SoLuong2) return (false, $"Combo cần mua ít nhất {v.SoLuong2} sản phẩm thuộc nhóm \"{Ten(v.MaDM2)}\".", 0);
            }
            // chỉ giảm trên các món thuộc combo (nếu combo chỉ định danh mục)
            if (v.MaDM1 != null || v.MaDM2 != null)
                coSo = lines.Where(l => l.MaDM == v.MaDM1 || l.MaDM == v.MaDM2).Sum(l => l.ThanhTien);
        }

        decimal giam;
        if (v.LoaiGiam == Const.GIAM_PHAN_TRAM)
        {
            giam = Math.Floor(coSo * v.GiaTriGiam / 100);
            if (v.GiamToiDa is > 0) giam = Math.Min(giam, v.GiamToiDa.Value);
        }
        else giam = Math.Min(v.GiaTriGiam, coSo);
        return (true, null, giam);
    }

    /// <summary>Danh sách mã đang chạy, kèm việc giỏ hàng hiện tại có dùng được không (để khách chọn).</summary>
    public async Task<List<VoucherOption>> OptionsAsync(int maTK, List<CartLineVm> lines)
    {
        var today = DateTime.Today;
        var all = await _db.Vouchers.AsNoTracking()
            .Where(v => v.DangBat && v.NgayHetHan >= today && v.NgayBatDau <= today && v.SoLuotConLai > 0)
            .OrderBy(v => v.LoaiKM).ThenBy(v => v.MaCode).ToListAsync();
        var res = new List<VoucherOption>();
        foreach (var v in all)
        {
            var (ok, loi, giam) = await EvaluateAsync(v, maTK, lines);
            res.Add(new VoucherOption { Voucher = v, DungDuoc = ok, LyDo = loi, Giam = giam });
        }
        return res.OrderByDescending(o => o.DungDuoc).ThenByDescending(o => o.Giam).ToList();
    }
}
