using DailyMan.Data;
using DailyMan.Models;
using Microsoft.EntityFrameworkCore;

namespace DailyMan.Services;

/// <summary>Hạng thành viên: ưu đãi tự động khi thanh toán + tính lại hạng theo tổng chi tiêu.</summary>
public class TierService
{
    private readonly AppDbContext _db;
    private readonly ConfigService _cfg;
    public TierService(AppDbContext db, ConfigService cfg) { _db = db; _cfg = cfg; }

    public async Task<bool> EnabledAsync() => await _cfg.GetAsync(Const.CFG_UU_DAI_HANG) == "1";

    /// <summary>Ưu đãi của khách ở mức tiền hàng cho trước (0 nếu tính năng đang tắt).</summary>
    public async Task<(decimal Giam, string? Ten, int Pct)> UuDaiAsync(int maTK, decimal tienHang)
    {
        if (!await EnabledAsync()) return (0, null, 0);
        var tk = await _db.TaiKhoans.AsNoTracking().Include(t => t.HangThanhVien).FirstOrDefaultAsync(t => t.MaTK == maTK);
        var h = tk?.HangThanhVien;
        if (h == null) return (0, null, 0);
        return (Math.Floor(tienHang * h.PhanTramUuDai / 100), h.TenHang, h.PhanTramUuDai);
    }

    /// <summary>Tổng chi tiêu = tổng các đơn đã Hoàn thành.</summary>
    public async Task<decimal> ChiTieuAsync(int maTK)
    {
        var q = from d in _db.DonHangs join t in _db.ThanhToans on d.MaDH equals t.MaDH
                where d.MaTK == maTK && d.MaTrangThai == Const.HOAN_THANH select (decimal?)t.SoTien;
        return await q.SumAsync() ?? 0;
    }

    /// <summary>Tính lại hạng của một khách theo chi tiêu (gọi khi đơn hoàn thành).</summary>
    public async Task RecomputeAsync(int maTK)
    {
        var tk = await _db.TaiKhoans.Include(t => t.VaiTro).FirstOrDefaultAsync(t => t.MaTK == maTK);
        if (tk == null || tk.VaiTro?.TenVaiTro != Const.ROLE_CUSTOMER) return;
        var chi = await ChiTieuAsync(maTK);
        var hang = await _db.HangThanhViens.Where(h => h.ChiTieuToiThieu <= chi).OrderByDescending(h => h.ChiTieuToiThieu).FirstOrDefaultAsync();
        tk.MaHang = hang?.MaHang;
        await _db.SaveChangesAsync();
    }

    public async Task<int> RecomputeAllAsync()
    {
        var ids = await _db.TaiKhoans.Where(t => t.VaiTro!.TenVaiTro == Const.ROLE_CUSTOMER).Select(t => t.MaTK).ToListAsync();
        foreach (var id in ids) await RecomputeAsync(id);
        return ids.Count;
    }
}
