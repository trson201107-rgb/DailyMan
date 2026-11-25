using DailyMan.Data;
using DailyMan.Helpers;
using DailyMan.Models;
using Microsoft.EntityFrameworkCore;

namespace DailyMan.Services;

public class PlaceOrderInput
{
    public int MaTK { get; set; }
    public int[] Selected { get; set; } = Array.Empty<int>();
    public string Ten { get; set; } = "";
    public string Sdt { get; set; } = "";
    public string DiaChi { get; set; } = "";
    public string? GhiChu { get; set; }
    public int MaPT { get; set; }
    public string? Code { get; set; }
}

/// <summary>Nghiệp vụ đơn hàng: đặt hàng, đổi trạng thái, hủy đơn, đổi trả.</summary>
public class OrderService
{
    private readonly AppDbContext _db;
    private readonly CartService _cart;
    private readonly CheckoutService _checkout;
    private readonly TierService _tier;

    public OrderService(AppDbContext db, CartService cart, CheckoutService checkout, TierService tier)
    { _db = db; _cart = cart; _checkout = checkout; _tier = tier; }

    /// <summary>
    /// ĐẶT HÀNG: kiểm tra tồn kho / giá / mã → tạo đơn → trừ tồn kho → xóa dòng đã đặt khỏi giỏ, tất cả trong MỘT giao dịch.
    /// Trả về (mã đơn, lỗi). Nếu lỗi thì không có gì bị thay đổi.
    /// </summary>
    public async Task<(int MaDH, string? Loi)> PlaceAsync(PlaceOrderInput inp)
    {
        await using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            var all = await _cart.GetLinesAsync(inp.MaTK);
            var lines = all.Where(l => inp.Selected.Contains(l.MaBT)).ToList();
            if (lines.Count == 0) return (0, "Giỏ hàng đang trống hoặc bạn chưa chọn sản phẩm nào để đặt.");

            foreach (var l in lines)
            {
                if (l.TrangThaiSP != Const.SP_BAN) return (0, $"Sản phẩm \"{l.TenSP}\" đã ngừng bán, vui lòng xóa khỏi giỏ hàng.");
                if (l.GiaDoi) return (0, $"Giá sản phẩm \"{l.TenSP}\" đã thay đổi từ {Fmt.Money(l.GiaLucThem)} thành {Fmt.Money(l.GiaBan)}. Vui lòng xem lại giỏ hàng và xác nhận giá mới.");
                if (l.SoLuong > l.Ton) return (0, $"Sản phẩm \"{l.TenSP}\" ({l.Mau}, {l.Size}) chỉ còn {l.Ton} trong kho.");
            }

            var tinh = await _checkout.CalculateAsync(inp.MaTK, lines, inp.Code);
            if (!string.IsNullOrWhiteSpace(inp.Code) && tinh.Voucher == null) return (0, tinh.LoiVoucher ?? "Mã giảm giá không dùng được.");

            var dh = new DonHang
            {
                TenNguoiNhan = inp.Ten, SDTNguoiNhan = inp.Sdt, DiaChiGiao = inp.DiaChi, GhiChu = inp.GhiChu,
                PhiVanChuyen = tinh.Phi, TienGiam = tinh.TongGiam, UuDaiHang = tinh.UuDaiHang,
                MaTK = inp.MaTK, MaTrangThai = Const.CHO, MaVoucher = tinh.Voucher?.MaVoucher
            };
            _db.DonHangs.Add(dh);
            await _db.SaveChangesAsync();          // để có MaDH

            var ids = lines.Select(l => l.MaBT).ToList();
            var bts = await _db.BienThes.Where(b => ids.Contains(b.MaBT)).ToListAsync();
            foreach (var l in lines)
            {
                var bt = bts.First(b => b.MaBT == l.MaBT);
                bt.SoLuongTon -= l.SoLuong;
                _db.ChiTietDonHangs.Add(new ChiTietDonHang { MaDH = dh.MaDH, MaBT = l.MaBT, SoLuong = l.SoLuong, DonGia = l.GiaBan });
                _db.LsTonKhos.Add(new LsTonKho { MaBT = l.MaBT, LoaiThaoTac = "Bán hàng", SoLuongThayDoi = -l.SoLuong, TonSau = bt.SoLuongTon, GhiChu = "Đơn #" + dh.MaDH, MaNguoiThucHien = inp.MaTK });
            }
            if (tinh.Voucher != null)
            {
                var v = await _db.Vouchers.FirstAsync(x => x.MaVoucher == tinh.Voucher.MaVoucher);
                if (v.SoLuotConLai <= 0) return (0, "Mã giảm giá đã hết lượt sử dụng.");
                v.SoLuotConLai -= 1;
            }
            _db.ThanhToans.Add(new ThanhToan { MaDH = dh.MaDH, SoTien = tinh.Tong, MaPT = inp.MaPT });
            _db.LichSuDonHangs.Add(new LichSuDonHang { MaDH = dh.MaDH, MaTrangThai = Const.CHO, GhiChu = "Khách đặt hàng", MaNguoiDoi = null });

            // chỉ xóa các dòng đã đặt, dòng chưa chọn vẫn nằm trong giỏ
            var gio = await _cart.GetCartAsync(inp.MaTK);
            var xoa = await _db.ChiTietGioHangs.Where(c => c.MaGH == gio.MaGH && ids.Contains(c.MaBT)).ToListAsync();
            _db.ChiTietGioHangs.RemoveRange(xoa);

            await _db.SaveChangesAsync();
            await tx.CommitAsync();
            return (dh.MaDH, null);
        }
        catch (DbUpdateConcurrencyException)
        {
            return (0, "Có người vừa mua mất sản phẩm bạn chọn. Vui lòng kiểm tra lại giỏ hàng.");
        }
    }

    /// <summary>Chuyển sang trạng thái KẾ TIẾP (không nhảy cóc, không quay lui). Trả về lỗi hoặc null.</summary>
    public async Task<string?> AdvanceAsync(int maDH, int userId)
    {
        var d = await _db.DonHangs.Include(x => x.ThanhToan).FirstOrDefaultAsync(x => x.MaDH == maDH);
        if (d == null) return $"Không tìm thấy đơn hàng #{maDH}.";
        if (d.MaTrangThai >= Const.HOAN_THANH) return $"Đơn #{maDH} đã kết thúc ({Const.TEN_TRANG_THAI[d.MaTrangThai]}), không thể đổi trạng thái.";
        var next = d.MaTrangThai + 1;
        d.MaTrangThai = next;
        _db.LichSuDonHangs.Add(new LichSuDonHang { MaDH = maDH, MaTrangThai = next, MaNguoiDoi = userId, GhiChu = "Cập nhật trạng thái" });
        if (next == Const.HOAN_THANH && d.ThanhToan != null)
        {
            d.ThanhToan.TrangThaiTT = "Đã thanh toán";
            d.ThanhToan.NgayThanhToan = DateTime.Now;
        }
        await _db.SaveChangesAsync();
        if (next == Const.HOAN_THANH) await _tier.RecomputeAsync(d.MaTK);
        return null;
    }

    /// <summary>
    /// HỦY ĐƠN: chuyển sang Đã hủy + ghi lý do + hoàn tồn kho + trả lại lượt mã giảm giá.
    /// allowed = các trạng thái được phép hủy; onlyMaTK != null => đơn phải thuộc khách đó.
    /// </summary>
    public async Task<string?> CancelAsync(int maDH, int[] allowed, int userId, string? lyDo, string? ghiChu, int? onlyMaTK)
    {
        var d = await _db.DonHangs.Include(x => x.ChiTiets).FirstOrDefaultAsync(x => x.MaDH == maDH && (onlyMaTK == null || x.MaTK == onlyMaTK));
        if (d == null) return "Không tìm thấy đơn hàng.";
        if (!allowed.Contains(d.MaTrangThai)) return "Không thể hủy đơn hàng ở trạng thái hiện tại.";
        if (string.IsNullOrWhiteSpace(lyDo) || !Const.LY_DO_HUY.Contains(lyDo)) return "Vui lòng chọn lý do hủy đơn.";
        if (lyDo == "Khác" && string.IsNullOrWhiteSpace(ghiChu)) return "Vui lòng nhập chi tiết lý do hủy.";

        d.MaTrangThai = Const.HUY;
        d.LyDoHuy = lyDo;
        var ids = d.ChiTiets.Select(c => c.MaBT).ToList();
        var bts = await _db.BienThes.Where(b => ids.Contains(b.MaBT)).ToListAsync();
        foreach (var c in d.ChiTiets)
        {
            var bt = bts.First(b => b.MaBT == c.MaBT);
            bt.SoLuongTon += c.SoLuong;
            _db.LsTonKhos.Add(new LsTonKho { MaBT = bt.MaBT, LoaiThaoTac = "Hoàn kho", SoLuongThayDoi = c.SoLuong, TonSau = bt.SoLuongTon, GhiChu = "Hủy đơn #" + maDH, MaNguoiThucHien = userId });
        }
        if (d.MaVoucher != null)
        {
            var v = await _db.Vouchers.FirstOrDefaultAsync(x => x.MaVoucher == d.MaVoucher);
            if (v != null) v.SoLuotConLai += 1;
        }
        var note = "Hủy đơn: " + lyDo + (string.IsNullOrWhiteSpace(ghiChu) ? "" : " – " + ghiChu.Trim());
        _db.LichSuDonHangs.Add(new LichSuDonHang { MaDH = maDH, MaTrangThai = Const.HUY, MaNguoiDoi = userId, GhiChu = note.Length > 255 ? note[..255] : note });
        await _db.SaveChangesAsync();
        return null;
    }

    // ---------- Đổi trả ----------
    public async Task<string?> RequestReturnAsync(int maDH, int maTK, string? nhom, string? chiTiet)
    {
        var d = await _db.DonHangs.Include(x => x.LichSus).FirstOrDefaultAsync(x => x.MaDH == maDH && x.MaTK == maTK);
        if (d == null) return "Không tìm thấy đơn hàng.";
        if (d.MaTrangThai != Const.HOAN_THANH) return "Chỉ đơn đã hoàn thành mới được yêu cầu đổi trả.";
        var xong = d.LichSus.Where(l => l.MaTrangThai == Const.HOAN_THANH).Select(l => (DateTime?)l.ThoiGian).Min() ?? d.NgayDat;
        if ((DateTime.Now - xong).TotalDays > Const.RETURN_DAYS) return $"Đã quá {Const.RETURN_DAYS} ngày kể từ khi đơn hoàn thành.";
        if (string.IsNullOrWhiteSpace(nhom) || !Const.LY_DO_DOI_TRA.Contains(nhom)) return "Vui lòng chọn lý do đổi trả.";
        if (string.IsNullOrWhiteSpace(chiTiet)) return "Vui lòng mô tả chi tiết lý do.";
        if (await _db.YeuCauDoiTras.AnyAsync(y => y.MaDH == maDH && y.TrangThai != Const.DT_NO)) return "Đơn này đã có yêu cầu đổi trả.";
        _db.YeuCauDoiTras.Add(new YeuCauDoiTra { MaDH = maDH, MaTK = maTK, NhomLyDo = nhom, LyDo = chiTiet.Trim() });
        await _db.SaveChangesAsync();
        return null;
    }

    public async Task<string?> ResolveReturnAsync(int maYC, bool chapNhan, string? lyDoTuChoi, int userId)
    {
        var y = await _db.YeuCauDoiTras.FirstOrDefaultAsync(x => x.MaYC == maYC);
        if (y == null) return "Không tìm thấy yêu cầu.";
        if (y.TrangThai != Const.DT_CHO) return "Yêu cầu này đã được xử lý.";
        if (!chapNhan && string.IsNullOrWhiteSpace(lyDoTuChoi)) return "Bắt buộc nhập lý do khi từ chối.";
        y.TrangThai = chapNhan ? Const.DT_OK : Const.DT_NO;
        y.LyDoTuChoi = chapNhan ? null : lyDoTuChoi!.Trim();
        y.NgayXuLy = DateTime.Now; y.MaNguoiXuLy = userId;
        if (chapNhan)
        {
            var d = await _db.DonHangs.FirstAsync(x => x.MaDH == y.MaDH);
            d.MaTrangThai = Const.DOI_TRA;
            _db.LichSuDonHangs.Add(new LichSuDonHang { MaDH = d.MaDH, MaTrangThai = Const.DOI_TRA, MaNguoiDoi = userId, GhiChu = "Chấp nhận đổi trả" });
        }
        await _db.SaveChangesAsync();
        if (chapNhan) await _tier.RecomputeAsync((await _db.DonHangs.FirstAsync(x => x.MaDH == y.MaDH)).MaTK);
        return null;
    }

    /// <summary>Tải đủ thông tin một đơn hàng để hiển thị. maTK != null => đơn phải thuộc khách đó.</summary>
    public async Task<DonHang?> LoadDetailAsync(int id, int? maTK) =>
        await _db.DonHangs.AsNoTracking().Include(x => x.TrangThai).Include(x => x.TaiKhoan).Include(x => x.ThanhToan).ThenInclude(t => t!.PhuongThuc)
            .Include(x => x.Voucher)
            .Include(x => x.ChiTiets).ThenInclude(c => c.BienThe).ThenInclude(b => b!.SanPham)
            .Include(x => x.ChiTiets).ThenInclude(c => c.BienThe).ThenInclude(b => b!.MauSac)
            .Include(x => x.ChiTiets).ThenInclude(c => c.BienThe).ThenInclude(b => b!.KichCo)
            .Include(x => x.LichSus).ThenInclude(l => l.TrangThai)
            .Include(x => x.LichSus).ThenInclude(l => l.NguoiDoi)
            .FirstOrDefaultAsync(x => x.MaDH == id && (maTK == null || x.MaTK == maTK));
}
