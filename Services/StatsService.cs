using DailyMan.Data;
using DailyMan.Models;
using DailyMan.ViewModels;
using Microsoft.EntityFrameworkCore;

namespace DailyMan.Services;

/// <summary>
/// Các số liệu cho phân hệ Thống kê (theo yêu cầu của thầy): tồn kho, doanh thu, KPI, tỷ lệ hoàn / hủy,
/// lý do hủy nhiều nhất, sản phẩm bán chạy / hết hàng, bán chạy theo size và theo màu.
/// Dữ liệu được đọc từ CSDL rồi tổng hợp bằng LINQ để dễ đọc, dễ giải thích.
/// </summary>
public class StatsService
{
    private readonly AppDbContext _db;
    private readonly ConfigService _cfg;
    public StatsService(AppDbContext db, ConfigService cfg) { _db = db; _cfg = cfg; }

    // ---------- Khoảng ngày ----------
    public static DateRange Range(string? tu, string? den, string? preset)
    {
        var today = DateTime.Today;
        if (DateTime.TryParse(tu, out var t) && DateTime.TryParse(den, out var d) && d >= t)
            return new DateRange { From = t.Date, ToExclusive = d.Date.AddDays(1), Preset = "tuychon" };
        return (preset ?? "30") switch
        {
            "7" => new DateRange { From = today.AddDays(-6), ToExclusive = today.AddDays(1), Preset = "7" },
            "90" => new DateRange { From = today.AddDays(-89), ToExclusive = today.AddDays(1), Preset = "90" },
            "thang" => new DateRange { From = new DateTime(today.Year, today.Month, 1), ToExclusive = today.AddDays(1), Preset = "thang" },
            _ => new DateRange { From = today.AddDays(-29), ToExclusive = today.AddDays(1), Preset = "30" }
        };
    }

    // ---------- Tồn kho ----------
    public async Task<TonKhoVm> TonKhoAsync()
    {
        var sps = await _db.SanPhams.AsNoTracking().Include(s => s.DanhMuc).Include(s => s.BienThes).ToListAsync();
        var dangBan = sps.Where(s => s.TrangThai == Const.SP_BAN).ToList();
        var bts = sps.SelectMany(s => s.BienThes).ToList();
        var vm = new TonKhoVm
        {
            TongSanPham = dangBan.Count,
            TongTon = dangBan.Sum(s => s.TongTon),
            GiaTriTon = dangBan.Sum(s => s.BienThes.Sum(b => b.SoLuongTon * s.GiaBan)),
            BienTheHet = dangBan.Sum(s => s.BienThes.Count(b => b.SoLuongTon == 0)),
            BienTheSap = dangBan.Sum(s => s.BienThes.Count(b => b.SoLuongTon is > 0 and <= 3)),
            TheoDanhMuc = dangBan.GroupBy(s => s.DanhMuc!.TenDM).Select(g => new ChartPoint(g.Key, g.Sum(s => s.TongTon))).OrderByDescending(p => p.Value).ToList(),
            GiaTriDanhMuc = dangBan.GroupBy(s => s.DanhMuc!.TenDM).Select(g => new ChartPoint(g.Key, g.Sum(s => s.BienThes.Sum(b => b.SoLuongTon * s.GiaBan)))).OrderByDescending(p => p.Value).ToList(),
            SanPhamSapHet = dangBan.Where(s => s.TongTon > 0 && s.TongTon <= Const.LOW_STOCK * 2).OrderBy(s => s.TongTon).Select(s => (s, s.TongTon)).Take(12).ToList(),
            SanPhamHetHang = dangBan.Where(s => s.TongTon == 0).Select(s => (s, 0)).ToList()
        };
        var ids = dangBan.Where(s => s.TongTon > 0).Select(s => s.MaSP).ToHashSet();
        vm.BienTheHetHang = await _db.BienThes.AsNoTracking().Include(b => b.SanPham).Include(b => b.MauSac).Include(b => b.KichCo)
            .Where(b => b.SoLuongTon == 0 && ids.Contains(b.MaSP)).OrderBy(b => b.SanPham!.TenSP).Take(40).ToListAsync();
        return vm;
    }

    // ---------- Doanh thu ----------
    public async Task<DoanhThuVm> DoanhThuAsync(DateRange r)
    {
        var orders = await _db.DonHangs.AsNoTracking().Include(d => d.ThanhToan).ThenInclude(t => t!.PhuongThuc)
            .Where(d => d.NgayDat >= r.From && d.NgayDat < r.ToExclusive && d.MaTrangThai != Const.HUY && d.MaTrangThai != Const.DOI_TRA).ToListAsync();
        var done = orders.Where(d => d.MaTrangThai == Const.HOAN_THANH).ToList();
        var vm = new DoanhThuVm
        {
            R = r, SoDon = done.Count,
            DoanhThu = done.Sum(d => d.ThanhToan?.SoTien ?? 0),
            TongGiam = done.Sum(d => d.TienGiam),
            DoanhThuDangCho = orders.Where(d => d.MaTrangThai != Const.HOAN_THANH).Sum(d => d.ThanhToan?.SoTien ?? 0),
        };
        vm.TrungBinhDon = vm.SoDon == 0 ? 0 : Math.Round(vm.DoanhThu / vm.SoDon);

        var theoNgay = done.GroupBy(d => d.NgayDat.Date).ToDictionary(g => g.Key, g => g.Sum(d => d.ThanhToan?.SoTien ?? 0));
        for (var day = r.From; day < r.ToExclusive; day = day.AddDays(1))
            vm.TheoNgay.Add(new ChartPoint(day.ToString("dd/MM"), theoNgay.GetValueOrDefault(day)));

        vm.TheoThanhToan = done.GroupBy(d => d.ThanhToan?.PhuongThuc?.TenPT ?? "Khác").Select(g => new ChartPoint(g.Key, g.Sum(d => d.ThanhToan?.SoTien ?? 0))).OrderByDescending(p => p.Value).ToList();
        vm.TheoThang = await DoanhThuThangAsync(6);

        var ids = done.Select(d => d.MaDH).ToList();
        var dong = await _db.ChiTietDonHangs.AsNoTracking().Where(c => ids.Contains(c.MaDH))
            .Select(c => new { Ten = c.BienThe!.SanPham!.DanhMuc!.TenDM, Tien = c.SoLuong * c.DonGia }).ToListAsync();
        vm.TheoDanhMuc = dong.GroupBy(x => x.Ten).Select(g => new ChartPoint(g.Key, g.Sum(x => x.Tien))).OrderByDescending(p => p.Value).ToList();
        return vm;
    }

    /// <summary>Doanh thu (đơn Hoàn thành) của N tháng gần nhất, kể cả tháng chưa có đơn.</summary>
    public async Task<List<ChartPoint>> DoanhThuThangAsync(int soThang)
    {
        var dau = new DateTime(DateTime.Today.Year, DateTime.Today.Month, 1).AddMonths(-(soThang - 1));
        var rows = await _db.DonHangs.AsNoTracking().Include(d => d.ThanhToan)
            .Where(d => d.MaTrangThai == Const.HOAN_THANH && d.NgayDat >= dau).ToListAsync();
        var res = new List<ChartPoint>();
        for (int i = 0; i < soThang; i++)
        {
            var m = dau.AddMonths(i);
            var sum = rows.Where(d => d.NgayDat.Year == m.Year && d.NgayDat.Month == m.Month).Sum(d => d.ThanhToan?.SoTien ?? 0);
            res.Add(new ChartPoint($"T{m.Month}/{m.Year % 100}", sum));
        }
        return res;
    }

    // ---------- KPI ----------
    public async Task<KpiVm> KpiAsync()
    {
        var today = DateTime.Today;
        var dauThang = new DateTime(today.Year, today.Month, 1);
        var dauThangTruoc = dauThang.AddMonths(-1);
        var mucTieuDT = await _cfg.GetNumberAsync(Const.CFG_MUC_TIEU_DOANH_THU, 25000000);
        var mucTieuDon = (int)await _cfg.GetNumberAsync(Const.CFG_MUC_TIEU_DON, 60);

        var thangNay = await _db.DonHangs.AsNoTracking().Include(d => d.ThanhToan).Where(d => d.NgayDat >= dauThang).ToListAsync();
        var thangTruoc = await _db.DonHangs.AsNoTracking().Include(d => d.ThanhToan).Where(d => d.NgayDat >= dauThangTruoc && d.NgayDat < dauThang && d.MaTrangThai == Const.HOAN_THANH).ToListAsync();

        var done = thangNay.Where(d => d.MaTrangThai == Const.HOAN_THANH).ToList();
        decimal dt = done.Sum(d => d.ThanhToan?.SoTien ?? 0);
        decimal dtTruoc = thangTruoc.Sum(d => d.ThanhToan?.SoTien ?? 0);
        int tong = thangNay.Count, huy = thangNay.Count(d => d.MaTrangThai == Const.HUY);
        int doiTra = thangNay.Count(d => d.MaTrangThai == Const.DOI_TRA);
        int daGiao = done.Count + doiTra;
        var donKhongHuy = thangNay.Where(d => d.MaTrangThai != Const.HUY).ToList();

        var khachMoi = await _db.TaiKhoans.CountAsync(t => t.NgayTao >= dauThang && t.VaiTro!.TenVaiTro == Const.ROLE_CUSTOMER);
        var soDonTheoKhach = await _db.DonHangs.AsNoTracking().Where(d => d.MaTrangThai != Const.HUY).GroupBy(d => d.MaTK).Select(g => g.Count()).ToListAsync();
        double quayLai = soDonTheoKhach.Count == 0 ? 0 : Math.Round(soDonTheoKhach.Count(n => n >= 2) * 100.0 / soDonTheoKhach.Count, 1);

        double tyHuy = Helpers.Fmt.Rate(huy, tong), tyHoan = Helpers.Fmt.Rate(doiTra, daGiao);
        double tyHoanThanh = Helpers.Fmt.Rate(done.Count, tong - huy);
        var aov = done.Count == 0 ? 0 : Math.Round(dt / done.Count);
        double tangTruong = dtTruoc == 0 ? 0 : Math.Round((double)((dt - dtTruoc) * 100 / dtTruoc), 1);

        var vm = new KpiVm
        {
            Thang = $"Tháng {today.Month}/{today.Year}", DoanhThu = dt, MucTieuDoanhThu = mucTieuDT, SoDon = donKhongHuy.Count, MucTieuDon = mucTieuDon, DoanhThuThangTruoc = dtTruoc,
            DoanhThu6Thang = await DoanhThuThangAsync(6)
        };
        vm.Items.Add(new KpiItem { Ten = "Doanh thu tháng", GiaTri = Helpers.Fmt.Money(dt), MucTieu = "≥ " + Helpers.Fmt.Money(mucTieuDT), PhanTram = mucTieuDT == 0 ? 0 : (double)(dt * 100 / mucTieuDT), Dat = dt >= mucTieuDT, GhiChu = "Chỉ tính đơn Hoàn thành" });
        vm.Items.Add(new KpiItem { Ten = "Số đơn hàng (không tính đơn hủy)", GiaTri = donKhongHuy.Count.ToString(), MucTieu = "≥ " + mucTieuDon, PhanTram = mucTieuDon == 0 ? 0 : donKhongHuy.Count * 100.0 / mucTieuDon, Dat = donKhongHuy.Count >= mucTieuDon });
        vm.Items.Add(new KpiItem { Ten = "Giá trị trung bình mỗi đơn (AOV)", GiaTri = Helpers.Fmt.Money(aov), MucTieu = "≥ 450.000đ", PhanTram = (double)aov * 100 / 450000, Dat = aov >= 450000 });
        vm.Items.Add(new KpiItem { Ten = "Tỷ lệ đơn hoàn thành", GiaTri = Helpers.Fmt.Pct(tyHoanThanh), MucTieu = "≥ 80%", PhanTram = tyHoanThanh / 80 * 100, Dat = tyHoanThanh >= 80, GhiChu = "Hoàn thành / đơn không hủy" });
        vm.Items.Add(new KpiItem { Ten = "Tỷ lệ hủy đơn", GiaTri = Helpers.Fmt.Pct(tyHuy), MucTieu = "≤ 10%", PhanTram = tyHuy == 0 ? 100 : Math.Min(100, 10 / tyHuy * 100), Dat = tyHuy <= 10, GhiChu = "Càng thấp càng tốt" });
        vm.Items.Add(new KpiItem { Ten = "Tỷ lệ hoàn / đổi trả", GiaTri = Helpers.Fmt.Pct(tyHoan), MucTieu = "≤ 5%", PhanTram = tyHoan == 0 ? 100 : Math.Min(100, 5 / tyHoan * 100), Dat = tyHoan <= 5, GhiChu = "Càng thấp càng tốt" });
        vm.Items.Add(new KpiItem { Ten = "Tăng trưởng doanh thu so với tháng trước", GiaTri = (tangTruong >= 0 ? "+" : "") + Helpers.Fmt.Pct(tangTruong), MucTieu = "≥ +5%", PhanTram = tangTruong / 5 * 100, Dat = tangTruong >= 5 });
        vm.Items.Add(new KpiItem { Ten = "Khách hàng mới trong tháng", GiaTri = khachMoi.ToString(), MucTieu = "≥ 5", PhanTram = khachMoi * 100.0 / 5, Dat = khachMoi >= 5 });
        vm.Items.Add(new KpiItem { Ten = "Tỷ lệ khách quay lại mua (≥ 2 đơn)", GiaTri = Helpers.Fmt.Pct(quayLai), MucTieu = "≥ 30%", PhanTram = quayLai / 30 * 100, Dat = quayLai >= 30 });

        vm.TheoTrangThai = thangNay.GroupBy(d => d.MaTrangThai).OrderBy(g => g.Key).Select(g => new ChartPoint(Const.TEN_TRANG_THAI[g.Key], g.Count(), TrangThaiMau(g.Key))).ToList();
        // đơn theo tuần (4 tuần gần nhất)
        var d0 = today.AddDays(-27);
        var gan = await _db.DonHangs.AsNoTracking().Where(d => d.NgayDat >= d0 && d.MaTrangThai != Const.HUY).ToListAsync();
        for (int i = 0; i < 4; i++)
        {
            var a = d0.AddDays(i * 7); var b = a.AddDays(7);
            vm.DonTheoTuan.Add(new ChartPoint($"{a:dd/MM}–{b.AddDays(-1):dd/MM}", gan.Count(d => d.NgayDat >= a && d.NgayDat < b)));
        }
        return vm;
    }

    public static string TrangThaiMau(int st) => st switch
    {
        Const.CHO => "#D9951A", Const.XAC_NHAN => "#2F6FDE", Const.DONG_GOI => "#6C8CD5", Const.DANG_GIAO => "#8E6CC9",
        Const.HOAN_THANH => "#2E7D5B", Const.HUY => "#C0392B", _ => "#8a7355"
    };

    // ---------- Tỷ lệ hoàn / hủy + lý do ----------
    public async Task<HoanHuyVm> HoanHuyAsync(DateRange r)
    {
        var orders = await _db.DonHangs.AsNoTracking().Include(d => d.ThanhToan).Where(d => d.NgayDat >= r.From && d.NgayDat < r.ToExclusive).ToListAsync();
        var huy = orders.Where(d => d.MaTrangThai == Const.HUY).ToList();
        int doiTra = orders.Count(d => d.MaTrangThai == Const.DOI_TRA);
        int daGiao = orders.Count(d => d.MaTrangThai == Const.HOAN_THANH) + doiTra;
        var yc = await _db.YeuCauDoiTras.AsNoTracking().Where(y => y.NgayTao >= r.From && y.NgayTao < r.ToExclusive).ToListAsync();
        return new HoanHuyVm
        {
            R = r, TongDon = orders.Count, DonHuy = huy.Count, TyLeHuy = Helpers.Fmt.Rate(huy.Count, orders.Count),
            TienMatDoHuy = huy.Sum(d => d.ThanhToan?.SoTien ?? 0),
            DonDoiTra = doiTra, DonDaGiao = daGiao, TyLeHoan = Helpers.Fmt.Rate(doiTra, daGiao), YeuCauDoiTra = yc.Count,
            LyDoHuy = huy.GroupBy(d => d.LyDoHuy ?? "Không ghi lý do").Select(g => new ChartPoint(g.Key, g.Count())).OrderByDescending(p => p.Value).ToList(),
            LyDoDoiTra = yc.GroupBy(y => string.IsNullOrEmpty(y.NhomLyDo) ? "Khác" : y.NhomLyDo).Select(g => new ChartPoint(g.Key, g.Count())).OrderByDescending(p => p.Value).ToList(),
            TheoTrangThai = orders.GroupBy(d => d.MaTrangThai).OrderBy(g => g.Key).Select(g => new ChartPoint(Const.TEN_TRANG_THAI[g.Key], g.Count(), TrangThaiMau(g.Key))).ToList()
        };
    }

    // ---------- Dòng hàng đã bán (dùng chung cho bán chạy / size / màu) ----------
    public class LineRow
    {
        public int SoLuong { get; set; }
        public decimal DonGia { get; set; }
        public int MaSP { get; set; }
        public string TenSP { get; set; } = "";
        public string? Anh { get; set; }
        public string Size { get; set; } = "";
        public int ThuTu { get; set; }
        public string Mau { get; set; } = "";
        public string Hex { get; set; } = "";
    }

    private async Task<List<LineRow>> DongDaBanAsync(DateRange r)
    {
        return await (from c in _db.ChiTietDonHangs
                      join d in _db.DonHangs on c.MaDH equals d.MaDH
                      where d.NgayDat >= r.From && d.NgayDat < r.ToExclusive && d.MaTrangThai != Const.HUY && d.MaTrangThai != Const.DOI_TRA
                      select new LineRow
                      {
                          SoLuong = c.SoLuong, DonGia = c.DonGia, MaSP = c.BienThe!.MaSP, TenSP = c.BienThe.SanPham!.TenSP, Anh = c.BienThe.SanPham.AnhDaiDien,
                          Size = c.BienThe.KichCo!.TenSize, ThuTu = c.BienThe.KichCo.ThuTu, Mau = c.BienThe.MauSac!.TenMau, Hex = c.BienThe.MauSac.MaHex
                      }).ToListAsync();
    }

    // ---------- Sản phẩm bán chạy / hết hàng ----------
    public async Task<SanPhamStatVm> SanPhamAsync(DateRange r)
    {
        var dong = await DongDaBanAsync(r);
        var sps = await _db.SanPhams.AsNoTracking().Include(s => s.BienThes).Where(s => s.TrangThai == Const.SP_BAN).ToListAsync();
        var ton = sps.ToDictionary(s => s.MaSP, s => s.TongTon);
        var vm = new SanPhamStatVm { R = r };
        vm.BanChay = dong.GroupBy(x => new { x.MaSP, x.TenSP, x.Anh })
            .Select(g => new SpBanChay { MaSP = g.Key.MaSP, TenSP = g.Key.TenSP, Anh = g.Key.Anh, SoLuong = g.Sum(x => x.SoLuong), DoanhThu = g.Sum(x => x.SoLuong * x.DonGia), TonHienTai = ton.GetValueOrDefault(g.Key.MaSP) })
            .OrderByDescending(x => x.SoLuong).ThenByDescending(x => x.DoanhThu).Take(10).ToList();
        var daBan = dong.Select(x => x.MaSP).ToHashSet();
        vm.ChuaBan = sps.Where(s => !daBan.Contains(s.MaSP) && s.TongTon > 0).OrderByDescending(s => s.TongTon).Take(8).ToList();
        vm.HetHang = sps.Where(s => s.TongTon == 0).Select(s => (s, 0)).ToList();
        vm.BienTheHet = await _db.BienThes.AsNoTracking().Include(b => b.SanPham).Include(b => b.MauSac).Include(b => b.KichCo)
            .Where(b => b.SoLuongTon == 0 && b.SanPham!.TrangThai == Const.SP_BAN).OrderBy(b => b.SanPham!.TenSP).ToListAsync();
        // chỉ giữ biến thể hết hàng của sản phẩm vẫn còn hàng ở màu / size khác
        var hetHangIds = vm.HetHang.Select(h => h.SP.MaSP).ToHashSet();
        vm.BienTheHet = vm.BienTheHet.Where(b => !hetHangIds.Contains(b.MaSP)).Take(30).ToList();
        return vm;
    }

    // ---------- Bán chạy theo size / màu ----------
    public async Task<SizeMauVm> SizeMauAsync(DateRange r)
    {
        var dong = await DongDaBanAsync(r);
        return new SizeMauVm
        {
            R = r, TongSoLuong = dong.Sum(x => x.SoLuong),
            TheoSize = dong.GroupBy(x => new { x.Size, x.ThuTu }).OrderBy(g => g.Key.ThuTu).Select(g => new ChartPoint(g.Key.Size, g.Sum(x => x.SoLuong))).ToList(),
            TheoMau = dong.GroupBy(x => new { x.Mau, x.Hex }).OrderByDescending(g => g.Sum(x => x.SoLuong)).Select(g => new ChartPoint(g.Key.Mau, g.Sum(x => x.SoLuong), g.Key.Hex)).ToList(),
            TopKetHop = dong.GroupBy(x => new { x.Mau, x.Size, x.Hex }).OrderByDescending(g => g.Sum(x => x.SoLuong)).Take(8)
                .Select(g => new ChartPoint($"{g.Key.Mau} – {g.Key.Size}", g.Sum(x => x.SoLuong), g.Key.Hex)).ToList()
        };
    }
}
