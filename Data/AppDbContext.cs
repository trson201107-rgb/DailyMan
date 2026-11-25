using DailyMan.Models;
using Microsoft.EntityFrameworkCore;

namespace DailyMan.Data;

/// <summary>Cầu nối giữa code C# và SQL Server (Entity Framework Core – Code First).</summary>
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<VaiTro> VaiTros => Set<VaiTro>();
    public DbSet<HangThanhVien> HangThanhViens => Set<HangThanhVien>();
    public DbSet<TaiKhoan> TaiKhoans => Set<TaiKhoan>();
    public DbSet<DiaChi> DiaChis => Set<DiaChi>();
    public DbSet<DanhMuc> DanhMucs => Set<DanhMuc>();
    public DbSet<SanPham> SanPhams => Set<SanPham>();
    public DbSet<MauSac> MauSacs => Set<MauSac>();
    public DbSet<KichCo> KichCos => Set<KichCo>();
    public DbSet<BienThe> BienThes => Set<BienThe>();
    public DbSet<AnhSanPham> AnhSanPhams => Set<AnhSanPham>();
    public DbSet<DanhGia> DanhGias => Set<DanhGia>();
    public DbSet<LsTonKho> LsTonKhos => Set<LsTonKho>();
    public DbSet<GioHang> GioHangs => Set<GioHang>();
    public DbSet<ChiTietGioHang> ChiTietGioHangs => Set<ChiTietGioHang>();
    public DbSet<TrangThaiDon> TrangThaiDons => Set<TrangThaiDon>();
    public DbSet<PhuongThucThanhToan> PhuongThucThanhToans => Set<PhuongThucThanhToan>();
    public DbSet<DonHang> DonHangs => Set<DonHang>();
    public DbSet<ChiTietDonHang> ChiTietDonHangs => Set<ChiTietDonHang>();
    public DbSet<ThanhToan> ThanhToans => Set<ThanhToan>();
    public DbSet<LichSuDonHang> LichSuDonHangs => Set<LichSuDonHang>();
    public DbSet<YeuCauDoiTra> YeuCauDoiTras => Set<YeuCauDoiTra>();
    public DbSet<Voucher> Vouchers => Set<Voucher>();
    public DbSet<CauHinh> CauHinhs => Set<CauHinh>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        base.OnModelCreating(mb);

        // Khóa chính gồm 2 cột
        mb.Entity<ChiTietGioHang>().HasKey(x => new { x.MaGH, x.MaBT });
        mb.Entity<ChiTietDonHang>().HasKey(x => new { x.MaDH, x.MaBT });

        // Cột không được trùng
        mb.Entity<TaiKhoan>().HasIndex(x => x.Email).IsUnique();
        mb.Entity<Voucher>().HasIndex(x => x.MaCode).IsUnique();
        mb.Entity<BienThe>().HasIndex(x => x.SKU).IsUnique();
        mb.Entity<GioHang>().HasIndex(x => x.MaTK).IsUnique();

        // ===== Khai báo RÕ RÀNG mọi khóa ngoại =====
        // EF không tự đoán được khóa ngoại khi tên cột là MaVaiTro, MaDM... (không theo quy ước "Id"), nên phải khai báo tay.
        // Nếu thiếu, EF tự tạo thêm cột phụ (vd VaiTroMaVaiTro) để trống và các thuộc tính điều hướng (tk.VaiTro...) sẽ bị null.
        mb.Entity<TaiKhoan>().HasOne(t => t.VaiTro).WithMany().HasForeignKey(t => t.MaVaiTro);
        mb.Entity<TaiKhoan>().HasOne(t => t.HangThanhVien).WithMany().HasForeignKey(t => t.MaHang);
        mb.Entity<GioHang>().HasOne<TaiKhoan>().WithMany().HasForeignKey(x => x.MaTK);
        mb.Entity<DiaChi>().HasOne<TaiKhoan>().WithMany().HasForeignKey(x => x.MaTK);

        mb.Entity<SanPham>().HasOne(s => s.DanhMuc).WithMany(d => d.SanPhams).HasForeignKey(s => s.MaDM);
        mb.Entity<BienThe>().HasOne(b => b.SanPham).WithMany(s => s.BienThes).HasForeignKey(b => b.MaSP);
        mb.Entity<BienThe>().HasOne(b => b.MauSac).WithMany().HasForeignKey(b => b.MaMau);
        mb.Entity<BienThe>().HasOne(b => b.KichCo).WithMany().HasForeignKey(b => b.MaSize);
        mb.Entity<AnhSanPham>().HasOne<SanPham>().WithMany(s => s.Anhs).HasForeignKey(a => a.MaSP);
        mb.Entity<AnhSanPham>().HasOne<MauSac>().WithMany().HasForeignKey(a => a.MaMau);
        mb.Entity<DanhGia>().HasOne<SanPham>().WithMany(s => s.DanhGias).HasForeignKey(d => d.MaSP);
        mb.Entity<DanhGia>().HasOne(d => d.TaiKhoan).WithMany().HasForeignKey(d => d.MaTK);
        mb.Entity<LsTonKho>().HasOne(l => l.BienThe).WithMany().HasForeignKey(l => l.MaBT);

        mb.Entity<ChiTietGioHang>().HasOne<GioHang>().WithMany(g => g.Dongs).HasForeignKey(c => c.MaGH);
        mb.Entity<ChiTietGioHang>().HasOne(c => c.BienThe).WithMany().HasForeignKey(c => c.MaBT);

        mb.Entity<DonHang>().HasOne(d => d.TaiKhoan).WithMany().HasForeignKey(d => d.MaTK);
        mb.Entity<DonHang>().HasOne(d => d.TrangThai).WithMany().HasForeignKey(d => d.MaTrangThai);
        mb.Entity<DonHang>().HasOne(d => d.Voucher).WithMany().HasForeignKey(d => d.MaVoucher);
        mb.Entity<ChiTietDonHang>().HasOne<DonHang>().WithMany(d => d.ChiTiets).HasForeignKey(c => c.MaDH);
        mb.Entity<ChiTietDonHang>().HasOne(c => c.BienThe).WithMany().HasForeignKey(c => c.MaBT);
        mb.Entity<LichSuDonHang>().HasOne<DonHang>().WithMany(d => d.LichSus).HasForeignKey(l => l.MaDH);
        mb.Entity<LichSuDonHang>().HasOne(l => l.TrangThai).WithMany().HasForeignKey(l => l.MaTrangThai);
        mb.Entity<LichSuDonHang>().HasOne(l => l.NguoiDoi).WithMany().HasForeignKey(l => l.MaNguoiDoi);
        mb.Entity<YeuCauDoiTra>().HasOne(y => y.DonHang).WithMany().HasForeignKey(y => y.MaDH);
        // Quan hệ 1-1: mỗi đơn có đúng 1 bản ghi thanh toán
        mb.Entity<DonHang>().HasOne(d => d.ThanhToan).WithOne().HasForeignKey<ThanhToan>(t => t.MaDH);
        mb.Entity<ThanhToan>().HasOne(t => t.PhuongThuc).WithMany().HasForeignKey(t => t.MaPT);

        // Không tự xóa dây chuyền (SQL Server báo lỗi "multiple cascade paths"); khi xóa ta tự xóa bảng con trong code
        foreach (var fk in mb.Model.GetEntityTypes().SelectMany(e => e.GetForeignKeys()))
            fk.DeleteBehavior = DeleteBehavior.Restrict;
    }
}
