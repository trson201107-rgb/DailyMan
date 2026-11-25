using DailyMan.Data;
using DailyMan.Models;
using DailyMan.ViewModels;
using Microsoft.EntityFrameworkCore;

namespace DailyMan.Services;

/// <summary>Giỏ hàng lưu trong CSDL, mỗi khách một giỏ.</summary>
public class CartService
{
    private readonly AppDbContext _db;
    public CartService(AppDbContext db) => _db = db;

    public async Task<GioHang> GetCartAsync(int maTK)
    {
        var g = await _db.GioHangs.FirstOrDefaultAsync(x => x.MaTK == maTK);
        if (g == null) { g = new GioHang { MaTK = maTK }; _db.GioHangs.Add(g); await _db.SaveChangesAsync(); }
        return g;
    }

    public async Task<List<CartLineVm>> GetLinesAsync(int maTK)
    {
        return await (from ct in _db.ChiTietGioHangs
                      join g in _db.GioHangs on ct.MaGH equals g.MaGH
                      where g.MaTK == maTK
                      orderby ct.MaBT
                      select new CartLineVm
                      {
                          MaBT = ct.MaBT, SoLuong = ct.SoLuong, GiaLucThem = ct.GiaLucThem,
                          SKU = ct.BienThe!.SKU, Ton = ct.BienThe.SoLuongTon, MaSP = ct.BienThe.MaSP,
                          TenSP = ct.BienThe.SanPham!.TenSP, GiaBan = ct.BienThe.SanPham.GiaBan,
                          TrangThaiSP = ct.BienThe.SanPham.TrangThai, MaDM = ct.BienThe.SanPham.MaDM,
                          Anh = ct.BienThe.SanPham.Anhs.Where(a => a.MaMau == ct.BienThe.MaMau).Select(a => a.DuongDan).FirstOrDefault() ?? ct.BienThe.SanPham.AnhDaiDien, Mau = ct.BienThe.MauSac!.TenMau, Size = ct.BienThe.KichCo!.TenSize
                      }).ToListAsync();
    }

    public async Task<int> CountAsync(int maTK)
    {
        var q = from ct in _db.ChiTietGioHangs join g in _db.GioHangs on ct.MaGH equals g.MaGH where g.MaTK == maTK select (int?)ct.SoLuong;
        return await q.SumAsync() ?? 0;
    }

    /// <summary>Thêm vào giỏ. Trả về thông báo lỗi hoặc null nếu thành công.</summary>
    public async Task<string?> AddAsync(int maTK, int maSP, int maMau, int maSize, int soLuong)
    {
        if (soLuong < 1) return "Số lượng phải từ 1 trở lên.";
        var bt = await _db.BienThes.Include(b => b.SanPham).FirstOrDefaultAsync(b => b.MaSP == maSP && b.MaMau == maMau && b.MaSize == maSize);
        if (bt == null) return "Vui lòng chọn đủ màu và size.";
        if (bt.SanPham!.TrangThai != Const.SP_BAN) return "Sản phẩm đã ngừng bán.";
        if (bt.SoLuongTon < 1) return "Phiên bản này đã hết hàng.";

        var gio = await GetCartAsync(maTK);
        var dong = await _db.ChiTietGioHangs.FirstOrDefaultAsync(c => c.MaGH == gio.MaGH && c.MaBT == bt.MaBT);
        var moi = (dong?.SoLuong ?? 0) + soLuong;
        if (moi > bt.SoLuongTon) return $"Chỉ còn {bt.SoLuongTon} sản phẩm trong kho (bạn đã có {dong?.SoLuong ?? 0} trong giỏ).";
        if (dong == null) _db.ChiTietGioHangs.Add(new ChiTietGioHang { MaGH = gio.MaGH, MaBT = bt.MaBT, SoLuong = moi, GiaLucThem = bt.SanPham.GiaBan });
        else { dong.SoLuong = moi; dong.GiaLucThem = bt.SanPham.GiaBan; }
        gio.NgayCapNhat = DateTime.Now;
        await _db.SaveChangesAsync();
        return null;
    }

    public async Task<string?> UpdateAsync(int maTK, int maBT, int soLuong)
    {
        var gio = await GetCartAsync(maTK);
        var dong = await _db.ChiTietGioHangs.Include(c => c.BienThe).FirstOrDefaultAsync(c => c.MaGH == gio.MaGH && c.MaBT == maBT);
        if (dong == null) return "Không tìm thấy sản phẩm trong giỏ.";
        if (soLuong < 1) { _db.ChiTietGioHangs.Remove(dong); await _db.SaveChangesAsync(); return null; }
        if (soLuong > dong.BienThe!.SoLuongTon) { dong.SoLuong = Math.Max(1, dong.BienThe.SoLuongTon); await _db.SaveChangesAsync(); return $"Chỉ còn {dong.BienThe.SoLuongTon} sản phẩm trong kho."; }
        dong.SoLuong = soLuong;
        await _db.SaveChangesAsync();
        return null;
    }

    public async Task RemoveAsync(int maTK, int maBT)
    {
        var gio = await GetCartAsync(maTK);
        var dong = await _db.ChiTietGioHangs.FirstOrDefaultAsync(c => c.MaGH == gio.MaGH && c.MaBT == maBT);
        if (dong != null) { _db.ChiTietGioHangs.Remove(dong); await _db.SaveChangesAsync(); }
    }

    /// <summary>Khách xác nhận giá mới: cập nhật "giá lúc thêm" bằng giá hiện tại.</summary>
    public async Task AcceptNewPricesAsync(int maTK)
    {
        var gio = await GetCartAsync(maTK);
        var dongs = await _db.ChiTietGioHangs.Include(c => c.BienThe!).ThenInclude(b => b.SanPham).Where(c => c.MaGH == gio.MaGH).ToListAsync();
        foreach (var d in dongs) d.GiaLucThem = d.BienThe!.SanPham!.GiaBan;
        await _db.SaveChangesAsync();
    }
}
