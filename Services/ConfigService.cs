using DailyMan.Data;
using Microsoft.EntityFrameworkCore;

namespace DailyMan.Services;

/// <summary>Đọc / ghi bảng CAU_HINH (cấu hình dạng khóa - giá trị).</summary>
public class ConfigService
{
    private readonly AppDbContext _db;
    public ConfigService(AppDbContext db) => _db = db;

    public async Task<string?> GetAsync(string khoa) =>
        (await _db.CauHinhs.AsNoTracking().FirstOrDefaultAsync(c => c.Khoa == khoa))?.GiaTri;

    public async Task<decimal> GetNumberAsync(string khoa, decimal macDinh)
    {
        var s = await GetAsync(khoa);
        return decimal.TryParse(s, out var v) ? v : macDinh;
    }

    public async Task SetAsync(string khoa, string giaTri)
    {
        var c = await _db.CauHinhs.FirstOrDefaultAsync(x => x.Khoa == khoa);
        if (c == null) _db.CauHinhs.Add(new Models.CauHinh { Khoa = khoa, GiaTri = giaTri });
        else c.GiaTri = giaTri;
        await _db.SaveChangesAsync();
    }
}
