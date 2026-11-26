using DailyMan.Models;
using Microsoft.AspNetCore.Identity;

namespace DailyMan.Data;

/// <summary>
/// Tạo dữ liệu mẫu lần đầu chạy (khi CSDL còn trống): vai trò, hạng thành viên, tài khoản, 46 sản phẩm,
/// mã giảm giá (sự kiện / combo / cấp bậc) và ~90 đơn hàng rải trong 75 ngày để các trang thống kê có số liệu.
/// Mật khẩu của mọi tài khoản mẫu: 123456
/// </summary>
public static class DbSeeder
{
    // (tên, danh mục, giá bán, giá gốc (0 = không giảm), mô tả, mã viết tắt SKU, màu[], size[], kiểu hình, ngày tạo lùi, lượt xem, trạng thái)
    record P(string Ten, int DM, int Gia, int GiaGoc, string MoTa, string Sku, string[] Mau, string[] Size, int Ngay, int Xem, bool Ban = true);

    static readonly string[] SA = { "S", "M", "L", "XL" };
    static readonly string[] SB = { "M", "L", "XL" };
    static readonly string[] SQ = { "29", "30", "31", "32" };
    static readonly string[] SF = { "Free" };

    // MaDM: 1 Áo thun, 2 Áo sơ mi, 3 Quần jeans, 4 Quần kaki, 5 Phụ kiện, 6 Áo polo, 7 Áo khoác, 8 Quần short
    static readonly List<P> Products = new()
    {
        // ---- Áo thun (1) ----
        new("Áo thun cotton basic", 1, 199000, 0, "Cotton 100%, form regular, thấm hút tốt", "AT-BASIC", new[]{"Trắng","Đen","Xám"}, SA, 90, 320),
        new("Áo thun oversize in hình", 1, 229000, 259000, "Form rộng, in hình phong cách đường phố", "AT-OVER", new[]{"Đen","Trắng"}, SB, 5, 60),
        new("Áo thun cổ tròn trơn", 1, 179000, 0, "Áo thun trơn, mặc lót hoặc mặc ngoài", "AT-TRON", new[]{"Trắng","Xám"}, SB, 200, 15, false),
        new("Áo thun cổ tim", 1, 189000, 0, "Cổ tim lịch sự, cotton co giãn 2 chiều", "AT-COTIM", new[]{"Đen","Xanh navy","Be"}, SA, 40, 85),
        new("Áo thun tay dài basic", 1, 249000, 0, "Tay dài mỏng nhẹ, mặc mát hoặc layer", "AT-TAYDAI", new[]{"Đen","Xám","Trắng"}, SA, 35, 70),
        new("Áo thun graphic Saigon", 1, 239000, 289000, "In chữ Sài Gòn, chất liệu cotton compact", "AT-SAIGON", new[]{"Trắng","Đen"}, SB, 22, 120),
        new("Áo thun sọc ngang", 1, 219000, 0, "Họa tiết sọc ngang phong cách Pháp", "AT-SOC", new[]{"Xanh navy","Trắng"}, SA, 18, 95),
        new("Áo thun tank top", 1, 149000, 0, "Áo ba lỗ thể thao thoáng khí", "AT-TANK", new[]{"Đen","Trắng","Xám"}, SA, 60, 40),
        new("Áo thun cotton cổ trụ", 1, 209000, 0, "Cổ trụ nhỏ gọn, dáng slim", "AT-COTRU", new[]{"Be","Nâu","Đen"}, SA, 12, 55),
        // ---- Áo sơ mi (2) ----
        new("Áo sơ mi Oxford tay dài", 2, 359000, 0, "Vải Oxford dày dặn, ít nhăn", "SM-OXF", new[]{"Trắng","Xanh navy"}, SB, 70, 180),
        new("Áo sơ mi linen ngắn tay", 2, 329000, 0, "Linen mát, phù hợp mùa hè", "SM-LINEN", new[]{"Be","Trắng"}, SB, 20, 110),
        new("Áo sơ mi flannel caro", 2, 389000, 449000, "Flannel mềm, họa tiết caro", "SM-FLAN", new[]{"Nâu","Xanh navy"}, SB, 8, 45),
        new("Áo sơ mi trắng công sở", 2, 349000, 0, "Chống nhăn, form slim-fit đi làm", "SM-TRANG", new[]{"Trắng"}, SA, 80, 210),
        new("Áo sơ mi denim", 2, 419000, 0, "Denim mỏng nhẹ, phong cách cá tính", "SM-DENIM", new[]{"Xanh denim","Đen"}, SB, 28, 88),
        new("Áo sơ mi sọc xanh", 2, 369000, 0, "Kẻ sọc dọc thanh lịch", "SM-SOC", new[]{"Xanh navy","Trắng"}, SB, 33, 64),
        new("Áo sơ mi cổ tàu", 2, 339000, 0, "Cổ tàu trẻ trung, vải đũi nhẹ", "SM-COTAU", new[]{"Be","Trắng","Đen"}, SB, 14, 52),
        // ---- Quần jeans (3) ----
        new("Quần jeans slim-fit", 3, 459000, 0, "Denim co giãn nhẹ, ôm vừa phải", "QJ-SLIM", new[]{"Xanh navy","Đen"}, SQ, 60, 260),
        new("Quần jeans baggy ống rộng", 3, 499000, 590000, "Denim dày, ống rộng thời trang", "QJ-BAGGY", new[]{"Xanh denim","Đen"}, SQ, 25, 205),
        new("Quần jeans straight xanh đậm", 3, 439000, 0, "Form straight cổ điển", "QJ-STRAIGHT", new[]{"Xanh denim"}, SQ, 40, 95),
        new("Quần jeans rách gối", 3, 479000, 0, "Rách nhẹ ở gối, phong cách street", "QJ-RACH", new[]{"Xanh denim","Đen"}, SQ, 16, 140),
        new("Quần jeans đen skinny", 3, 449000, 0, "Skinny co giãn 4 chiều", "QJ-SKINNY", new[]{"Đen"}, SQ, 50, 76),
        new("Quần jeans wash xám khói", 3, 469000, 0, "Wash màu xám khói độc đáo", "QJ-XAM", new[]{"Xám"}, SQ, 9, 38),
        // ---- Quần kaki (4) ----
        new("Quần kaki ống đứng", 4, 399000, 0, "Kaki cotton, đứng form", "QK-ONGDUNG", new[]{"Đen","Be"}, SQ, 55, 140),
        new("Quần kaki jogger", 4, 369000, 429000, "Kaki co giãn, bo gấu", "QK-JOGGER", new[]{"Xám","Đen"}, SQ, 15, 70),
        new("Quần kaki slim-crop", 4, 379000, 0, "Ống lửng 9 tấc, dáng gọn", "QK-CROP", new[]{"Be","Nâu","Xanh navy"}, SQ, 21, 58),
        new("Quần kaki ống suông", 4, 409000, 0, "Ống suông thoải mái, vải dày dặn", "QK-SUONG", new[]{"Be","Đen"}, SQ, 30, 66),
        new("Quần kaki túi hộp", 4, 429000, 0, "Túi hộp tiện dụng, phong cách workwear", "QK-HOP", new[]{"Nâu","Xám"}, SQ, 11, 49),
        // ---- Phụ kiện (5) ----
        new("Nón lưỡi trai basic", 5, 149000, 179000, "Nón cotton thêu logo", "PK-NON", new[]{"Đen","Be","Xanh navy"}, SF, 30, 130),
        new("Thắt lưng da bò", 5, 249000, 0, "Da bò thật, khóa kim loại", "PK-TL", new[]{"Đen","Nâu"}, SF, 45, 85),
        new("Ví da nam gấp đôi", 5, 329000, 0, "Ví da PU cao cấp nhiều ngăn", "PK-VI", new[]{"Đen","Nâu"}, SF, 18, 100),
        new("Vớ cotton cổ cao (set 3 đôi)", 5, 99000, 0, "Set 3 đôi vớ cotton thấm hút", "PK-VO", new[]{"Trắng","Đen","Xám"}, SF, 70, 45),
        new("Balo canvas đi học đi làm", 5, 389000, 450000, "Canvas chống nước nhẹ, ngăn laptop 15 inch", "PK-BALO", new[]{"Đen","Xám"}, SF, 24, 115),
        new("Kính mát gọng vuông", 5, 199000, 0, "Chống UV400, gọng nhựa bền", "PK-KINH", new[]{"Đen","Nâu"}, SF, 6, 32),
        // ---- Áo polo (6) ----
        new("Áo polo pique thể thao", 6, 259000, 299000, "Vải pique thoáng khí, cổ bẻ", "AP-PIQUE", new[]{"Trắng","Xanh navy","Đen"}, SB, 12, 150),
        new("Áo polo trơn cổ dệt", 6, 279000, 0, "Cổ dệt bo, form regular", "AP-TRON", new[]{"Trắng","Đen","Be"}, SA, 38, 98),
        new("Áo polo sọc ngang", 6, 289000, 0, "Sọc ngang trẻ trung", "AP-SOC", new[]{"Xanh navy","Xám"}, SA, 17, 72),
        new("Áo polo thể thao cool-dry", 6, 319000, 0, "Công nghệ khô nhanh, khử mùi", "AP-COOL", new[]{"Đen","Xám","Xanh navy"}, SA, 7, 125),
        // ---- Áo khoác (7) ----
        new("Áo khoác bomber", 7, 549000, 650000, "Bomber lót dù, bo tay chun", "AK-BOMBER", new[]{"Đen","Xanh navy"}, SB, 19, 160),
        new("Áo khoác denim", 7, 589000, 0, "Denim dày, form boxy", "AK-DENIM", new[]{"Xanh denim","Đen"}, SB, 42, 135),
        new("Áo khoác gió 2 lớp", 7, 459000, 0, "Chống gió, chống nước nhẹ", "AK-GIO", new[]{"Đen","Xám","Xanh navy"}, SB, 26, 92),
        new("Áo hoodie nỉ bông", 7, 429000, 499000, "Nỉ bông dày ấm, mũ 2 lớp", "AK-HOODIE", new[]{"Xám","Đen","Be"}, SA, 10, 180),
        new("Áo cardigan len", 7, 479000, 0, "Len mềm, cài nút phong cách Hàn", "AK-CARDI", new[]{"Be","Đen"}, SB, 32, 58),
        // ---- Quần short (8) ----
        new("Quần short kaki", 8, 299000, 0, "Short kaki đi biển, dạo phố", "QS-KAKI", new[]{"Be","Nâu"}, SQ, 100, 25, false),
        new("Quần short thể thao", 8, 189000, 0, "Thun lạnh co giãn, có túi khóa kéo", "QS-TT", new[]{"Đen","Xám","Xanh navy"}, SQ, 14, 110),
        new("Quần short jeans", 8, 349000, 0, "Short denim ống rộng", "QS-JEANS", new[]{"Xanh denim","Đen"}, SQ, 20, 74),
        new("Quần short linen", 8, 279000, 0, "Linen thoáng mát, lưng thun", "QS-LINEN", new[]{"Be","Trắng"}, SQ, 9, 46),
    };

    static readonly Dictionary<string, (string Hex, string Code)> MauMap = new()
    {
        ["Trắng"] = ("#FFFFFF", "TRG"), ["Đen"] = ("#1B1B1B", "DEN"), ["Xanh navy"] = ("#1F2A44", "NAV"), ["Xám"] = ("#808080", "XAM"),
        ["Be"] = ("#D8C3A5", "BE"), ["Nâu"] = ("#6B4423", "NAU"), ["Xanh denim"] = ("#3B5B8C", "DNM"),
    };

    public static void Seed(AppDbContext db)
    {
        // Đã seed xong đúng phiên bản này (dấu SEED_XONG = v3) => không làm gì nữa.
        if (db.CauHinhs.Any(c => c.Khoa == "SEED_XONG" && c.GiaTri == "v3")) return;
        // Có dữ liệu nhưng chưa có dấu v3 => DB do lần chạy trước (lỗi hoặc bản cũ) tạo ra: xóa rồi seed lại từ đầu.
        if (db.VaiTros.Any()) { db.Database.EnsureDeleted(); db.Database.EnsureCreated(); }
        var rnd = new Random(20261116);
        var now = DateTime.Now;
        var hasher = new PasswordHasher<TaiKhoan>();

        // ===== Danh mục kết nối =====
        db.VaiTros.AddRange(new VaiTro { TenVaiTro = Const.ROLE_CUSTOMER }, new VaiTro { TenVaiTro = Const.ROLE_STAFF }, new VaiTro { TenVaiTro = Const.ROLE_ADMIN });
        db.HangThanhViens.AddRange(
            new HangThanhVien { TenHang = "Đồng", ChiTieuToiThieu = 0, PhanTramUuDai = 5 },
            new HangThanhVien { TenHang = "Bạc", ChiTieuToiThieu = 3000000, PhanTramUuDai = 10 },
            new HangThanhVien { TenHang = "Vàng", ChiTieuToiThieu = 7000000, PhanTramUuDai = 15 },
            new HangThanhVien { TenHang = "Kim cương", ChiTieuToiThieu = 15000000, PhanTramUuDai = 20 });
        db.TrangThaiDons.AddRange(Const.TEN_TRANG_THAI.Skip(1).Select(t => new TrangThaiDon { TenTrangThai = t }));
        db.PhuongThucThanhToans.AddRange(new PhuongThucThanhToan { TenPT = "COD" }, new PhuongThucThanhToan { TenPT = "QR" });
        db.CauHinhs.AddRange(
            new CauHinh { Khoa = Const.CFG_UU_DAI_HANG, GiaTri = "1" },
            new CauHinh { Khoa = Const.CFG_MUC_TIEU_DOANH_THU, GiaTri = "25000000" },
            new CauHinh { Khoa = Const.CFG_MUC_TIEU_DON, GiaTri = "60" });
        db.DanhMucs.AddRange(new[]
        {
            ("Áo thun", "Áo thun nam thường nhật"), ("Áo sơ mi", "Sơ mi nam công sở và dạo phố"), ("Quần jeans", "Quần jeans nam"),
            ("Quần kaki", "Quần kaki nam"), ("Phụ kiện", "Nón, thắt lưng, ví, balo"), ("Áo polo", "Áo polo nam lịch sự, năng động"),
            ("Áo khoác", "Áo khoác, hoodie, cardigan"), ("Quần short", "Quần short nam mùa hè"),
        }.Select(x => new DanhMuc { TenDM = x.Item1, MoTa = x.Item2 }));
        db.MauSacs.AddRange(MauMap.Select(kv => new MauSac { TenMau = kv.Key, MaHex = kv.Value.Hex }));
        db.KichCos.AddRange(new[] { "S", "M", "L", "XL", "XXL", "Free", "29", "30", "31", "32" }.Select((s, i) => new KichCo { TenSize = s, ThuTu = i + 1 }));
        db.SaveChanges();

        // ===== Tài khoản =====
        TaiKhoan Tk(string ten, string email, string sdt, int role, int? hang, int ngayTruoc = 120)
        {
            var t = new TaiKhoan { HoTen = ten, Email = email, SoDienThoai = sdt, MaVaiTro = role, MaHang = hang, NgayTao = now.AddDays(-ngayTruoc) };
            t.MatKhauHash = hasher.HashPassword(t, "123456");
            return t;
        }
        var admin = Tk("Phạm Minh Đức", "duc.pham@shop.vn", "0901000004", 3, null, 200);
        var staff1 = Tk("Lê Quốc Cường", "cuong.le@shop.vn", "0901000003", 2, null, 180);
        var staff2 = Tk("Đặng Thu Trang", "trang.dang@shop.vn", "0901000007", 2, null, 150);
        var admin2 = Tk("Ngô Bảo Long", "long.ngo@shop.vn", "0901000008", 3, null, 190);
        db.TaiKhoans.AddRange(admin, staff1, staff2, admin2);
        var khach = new (string, string)[]
        {
            ("Nguyễn Văn An", "an.nguyen@gmail.com"), ("Trần Thị Bình", "binh.tran@gmail.com"), ("Hoàng Thu Hà", "ha.hoang@gmail.com"),
            ("Vũ Đức Khánh", "khanh.vu@gmail.com"), ("Lý Minh Tuấn", "tuan.ly@gmail.com"), ("Phan Thị Lan", "lan.phan@gmail.com"),
            ("Đỗ Hải Nam", "nam.do@gmail.com"), ("Bùi Quang Huy", "huy.bui@gmail.com"), ("Mai Thanh Sơn", "son.mai@gmail.com"),
            ("Trịnh Gia Bảo", "bao.trinh@gmail.com"), ("Cao Thị Mai", "mai.cao@gmail.com"), ("Dương Văn Phúc", "phuc.duong@gmail.com"),
        };
        var customers = new List<TaiKhoan>();
        for (int i = 0; i < khach.Length; i++)
            customers.Add(Tk(khach[i].Item1, khach[i].Item2, "09010001" + (10 + i), 1, 1, 100 - i * 6));
        db.TaiKhoans.AddRange(customers);
        db.SaveChanges();
        var tinh = new[] { ("Hà Nội", "Hoàn Kiếm", "12 Trần Hưng Đạo"), ("Hà Nội", "Cầu Giấy", "99 Duy Tân"), ("TP. Hồ Chí Minh", "Quận 1", "5 Điện Biên Phủ"), ("Đà Nẵng", "Hải Châu", "30 Bạch Đằng") };
        for (int i = 0; i < customers.Count; i++)
        {
            var d = tinh[i % tinh.Length];
            db.DiaChis.Add(new DiaChi { MaTK = customers[i].MaTK, TenNguoiNhan = customers[i].HoTen, SDT = customers[i].SoDienThoai, TinhThanh = d.Item1, QuanHuyen = d.Item2, DiaChiCuThe = d.Item3, MacDinh = true });
        }

        // ===== Sản phẩm + biến thể =====
        var mauDb = db.MauSacs.ToList().ToDictionary(m => m.TenMau);
        var sizeDb = db.KichCos.ToList().ToDictionary(s => s.TenSize);
        var variants = new List<BienThe>();
        for (int i = 0; i < Products.Count; i++)
        {
            var p = Products[i];
            // Ảnh thật theo từng màu (xem ProductImages.cs); màu nào chưa có ảnh thì bỏ qua
            var anhs = new List<AnhSanPham>();
            foreach (var m in p.Mau)
                if (ProductImages.Map.TryGetValue($"{p.Sku}|{m}", out var file))
                    anhs.Add(new AnhSanPham { MaMau = mauDb[m].MaMau, DuongDan = "/images/products/" + file, ThuTu = anhs.Count });
            var sp = new SanPham
            {
                TenSP = p.Ten, MaDM = p.DM, GiaBan = p.Gia, GiaGoc = p.GiaGoc > 0 ? p.GiaGoc : null, MoTa = p.MoTa,
                TrangThai = p.Ban ? Const.SP_BAN : Const.SP_AN, NgayTao = now.AddDays(-p.Ngay), NgayCapNhat = now.AddDays(-Math.Max(1, p.Ngay - 3)),
                NguoiTao = admin.MaTK, NguoiCapNhat = admin.MaTK, LuotXem = p.Xem,
                AnhDaiDien = anhs.Count > 0 ? anhs[0].DuongDan : null
            };
            db.SanPhams.Add(sp);
            db.SaveChanges();
            foreach (var a in anhs) { a.MaSP = sp.MaSP; db.AnhSanPhams.Add(a); }
            foreach (var m in p.Mau)
                foreach (var s in p.Size)
                {
                    // vài biến thể cố ý hết hàng / sắp hết để thống kê tồn kho có dữ liệu
                    int r = rnd.Next(100);
                    int ton = r < 12 ? 0 : r < 25 ? rnd.Next(1, 4) : rnd.Next(5, 31);
                    if (!p.Ban) ton = rnd.Next(0, 4);
                    var bt = new BienThe { SKU = $"{p.Sku}-{MauMap[m].Code}-{s}", SoLuongTon = ton, MaSP = sp.MaSP, MaMau = mauDb[m].MaMau, MaSize = sizeDb[s].MaSize };
                    variants.Add(bt);
                    db.BienThes.Add(bt);
                }
            db.SaveChanges();
        }
        // Một sản phẩm đang bán nhưng hết sạch hàng (để thống kê "sản phẩm hết hàng")
        foreach (var name in new[] { "Áo thun oversize in hình", "Quần jeans wash xám khói", "Kính mát gọng vuông" })
        {
            var spId = db.SanPhams.First(x => x.TenSP == name).MaSP;
            foreach (var bt in db.BienThes.Where(b => b.MaSP == spId)) bt.SoLuongTon = 0;
        }
        db.SaveChanges();

        // ===== Mã giảm giá: sự kiện / combo / cấp bậc =====
        DateTime D(int y, int m, int d) => new DateTime(y, m, d);
        db.Vouchers.AddRange(
            // --- giảm theo sự kiện ---
            new Voucher { MaCode = "DAILY10", TenChuongTrinh = "Ưu đãi thường nhật", LoaiKM = Const.KM_SU_KIEN, LoaiGiam = Const.GIAM_PHAN_TRAM, GiaTriGiam = 10, GiamToiDa = 100000, DonToiThieu = 300000, SoLuotConLai = 198, NgayBatDau = D(2026,1,1), NgayHetHan = D(2027,12,31) },
            new Voucher { MaCode = "FREESHIP30", TenChuongTrinh = "Hỗ trợ phí vận chuyển", LoaiKM = Const.KM_SU_KIEN, LoaiGiam = Const.GIAM_TIEN, GiaTriGiam = 30000, DonToiThieu = 300000, SoLuotConLai = 98, NgayBatDau = D(2026,1,1), NgayHetHan = D(2027,12,31) },
            new Voucher { MaCode = "WELCOME50", TenChuongTrinh = "Chào bạn mới", LoaiKM = Const.KM_SU_KIEN, LoaiGiam = Const.GIAM_TIEN, GiaTriGiam = 50000, DonToiThieu = 400000, SoLuotConLai = 100, NgayBatDau = D(2026,1,1), NgayHetHan = D(2027,12,31) },
            new Voucher { MaCode = "BLACKFRIDAY", TenChuongTrinh = "Black Friday 2026", LoaiKM = Const.KM_SU_KIEN, LoaiGiam = Const.GIAM_PHAN_TRAM, GiaTriGiam = 20, GiamToiDa = 300000, DonToiThieu = 500000, SoLuotConLai = 300, NgayBatDau = D(2026,11,13), NgayHetHan = D(2026,11,30) },
            new Voucher { MaCode = "SINGLES1111", TenChuongTrinh = "Ngày độc thân 11.11", LoaiKM = Const.KM_SU_KIEN, LoaiGiam = Const.GIAM_PHAN_TRAM, GiaTriGiam = 11, GiamToiDa = 150000, DonToiThieu = 200000, SoLuotConLai = 0, NgayBatDau = D(2026,11,9), NgayHetHan = D(2026,11,12) },
            new Voucher { MaCode = "NOEL2026", TenChuongTrinh = "Giáng sinh 2026", LoaiKM = Const.KM_SU_KIEN, LoaiGiam = Const.GIAM_PHAN_TRAM, GiaTriGiam = 15, GiamToiDa = 200000, DonToiThieu = 400000, SoLuotConLai = 200, NgayBatDau = D(2026,12,15), NgayHetHan = D(2026,12,26) },
            // --- giảm theo combo ---
            new Voucher { MaCode = "COMBO2THUN", TenChuongTrinh = "Combo 2 áo thun", LoaiKM = Const.KM_COMBO, LoaiGiam = Const.GIAM_PHAN_TRAM, GiaTriGiam = 15, DonToiThieu = 0, SoLuotConLai = 500, NgayBatDau = D(2026,1,1), NgayHetHan = D(2027,12,31), MaDM1 = 1, SoLuong1 = 2 },
            new Voucher { MaCode = "COMBOAOQUAN", TenChuongTrinh = "Combo áo + quần", LoaiKM = Const.KM_COMBO, LoaiGiam = Const.GIAM_TIEN, GiaTriGiam = 100000, DonToiThieu = 0, SoLuotConLai = 400, NgayBatDau = D(2026,1,1), NgayHetHan = D(2027,12,31), MaDM1 = 2, SoLuong1 = 1, MaDM2 = 3, SoLuong2 = 1 },
            new Voucher { MaCode = "COMBOPOLOKAKI", TenChuongTrinh = "Combo polo + kaki", LoaiKM = Const.KM_COMBO, LoaiGiam = Const.GIAM_PHAN_TRAM, GiaTriGiam = 12, GiamToiDa = 120000, DonToiThieu = 0, SoLuotConLai = 300, NgayBatDau = D(2026,1,1), NgayHetHan = D(2027,12,31), MaDM1 = 6, SoLuong1 = 1, MaDM2 = 4, SoLuong2 = 1 },
            new Voucher { MaCode = "MUA3GIAM10", TenChuongTrinh = "Mua 3 sản phẩm bất kỳ", LoaiKM = Const.KM_COMBO, LoaiGiam = Const.GIAM_PHAN_TRAM, GiaTriGiam = 10, DonToiThieu = 0, SoLuotConLai = 250, NgayBatDau = D(2026,1,1), NgayHetHan = D(2027,12,31), SoLuong1 = 3 },
            // --- giảm theo cấp bậc tài khoản (MaHangToiThieu: 2 = Bạc, 3 = Vàng, 4 = Kim cương) ---
            new Voucher { MaCode = "BAC8", TenChuongTrinh = "Ưu đãi hạng Bạc trở lên", LoaiKM = Const.KM_CAP_BAC, LoaiGiam = Const.GIAM_PHAN_TRAM, GiaTriGiam = 8, GiamToiDa = 100000, DonToiThieu = 300000, SoLuotConLai = 1000, NgayBatDau = D(2026,1,1), NgayHetHan = D(2027,12,31), MaHangToiThieu = 2 },
            new Voucher { MaCode = "VANG150", TenChuongTrinh = "Đặc quyền hạng Vàng", LoaiKM = Const.KM_CAP_BAC, LoaiGiam = Const.GIAM_TIEN, GiaTriGiam = 150000, DonToiThieu = 600000, SoLuotConLai = 500, NgayBatDau = D(2026,1,1), NgayHetHan = D(2027,12,31), MaHangToiThieu = 3 },
            new Voucher { MaCode = "KIMCUONG25", TenChuongTrinh = "Đặc quyền Kim cương", LoaiKM = Const.KM_CAP_BAC, LoaiGiam = Const.GIAM_PHAN_TRAM, GiaTriGiam = 25, GiamToiDa = 500000, DonToiThieu = 800000, SoLuotConLai = 200, NgayBatDau = D(2026,1,1), NgayHetHan = D(2027,12,31), MaHangToiThieu = 4 });
        db.SaveChanges();

        // ===== Đơn hàng mẫu (90 đơn trong 75 ngày) =====
        var spMap = db.SanPhams.Where(s => s.TrangThai == Const.SP_BAN).ToList();
        var btAll = db.BienThes.ToList();
        var byProd = btAll.GroupBy(b => b.MaSP).ToDictionary(g => g.Key, g => g.ToList());
        // trọng số: sản phẩm Hot dễ được mua hơn
        var weighted = spMap.SelectMany(s => Enumerable.Repeat(s, 1 + s.LuotXem / 60)).ToList();
        var lyDoHuy = new[] { 0, 0, 0, 1, 1, 2, 3, 3, 4, 5 };
        var lyDoDT = new[] { 0, 0, 0, 1, 1, 2, 2, 3, 4, 5 };
        for (int k = 0; k < 90; k++)
        {
            var kh = customers[rnd.Next(customers.Count)];
            var addr = db.DiaChis.First(a => a.MaTK == kh.MaTK);
            var ngay = now.AddHours(-(rnd.NextDouble() < 0.6 ? rnd.Next(2, 30 * 24) : rnd.Next(30 * 24, 75 * 24)));
            // trạng thái: đơn càng mới càng dễ đang xử lý
            int ageDays = (int)(now - ngay).TotalDays;
            int tt;
            double x = rnd.NextDouble();
            if (ageDays < 2) tt = x < 0.5 ? 1 : x < 0.8 ? 2 : 3;
            else if (ageDays < 5) tt = x < 0.2 ? 1 : x < 0.35 ? 2 : x < 0.5 ? 3 : x < 0.7 ? 4 : x < 0.88 ? 5 : 6;
            else tt = x < 0.72 ? 5 : x < 0.86 ? 6 : 7;
            // Lưu đơn hàng TRƯỚC (chưa có chi tiết) để có MaDH thật, rồi mới thêm chi tiết / thanh toán / lịch sử với MaDH đó.
            // (Không thêm cả "cây" cùng lúc vì khóa chính của chi tiết đơn gồm 2 cột MaDH + MaBT, EF sẽ bị lẫn khóa tạm.)
            var dh = new DonHang { NgayDat = ngay, TenNguoiNhan = kh.HoTen, SDTNguoiNhan = kh.SoDienThoai, DiaChiGiao = addr.DayDu, MaTK = kh.MaTK, MaTrangThai = tt };
            var nDong = rnd.Next(1, 4);
            var dongs = new List<(int MaBT, int SL, decimal Gia)>();
            for (int j = 0; j < nDong; j++)
            {
                var sp = weighted[rnd.Next(weighted.Count)];
                var bt = byProd[sp.MaSP][rnd.Next(byProd[sp.MaSP].Count)];
                if (dongs.Any(d => d.MaBT == bt.MaBT)) continue;          // mỗi biến thể chỉ 1 dòng trong 1 đơn
                dongs.Add((bt.MaBT, rnd.NextDouble() < 0.3 ? 2 : 1, sp.GiaBan));
            }
            var tienHang = dongs.Sum(d => d.SL * d.Gia);
            dh.PhiVanChuyen = tienHang >= Const.FREE_SHIP_FROM ? 0 : Const.SHIP_FEE;
            if (rnd.NextDouble() < 0.25) dh.TienGiam = Math.Floor(tienHang * 0.1m / 1000) * 1000;
            if (tt == Const.HUY) dh.LyDoHuy = Const.LY_DO_HUY[lyDoHuy[rnd.Next(lyDoHuy.Length)]];
            var pt = rnd.NextDouble() < 0.6 ? 1 : 2;
            var tong = tienHang + dh.PhiVanChuyen - dh.TienGiam;
            db.DonHangs.Add(dh);
            db.SaveChanges();                                              // => dh.MaDH là số thật

            foreach (var d in dongs)
                db.ChiTietDonHangs.Add(new ChiTietDonHang { MaDH = dh.MaDH, MaBT = d.MaBT, SoLuong = d.SL, DonGia = d.Gia });
            bool daTra = tt == Const.HOAN_THANH || tt == Const.DOI_TRA;
            db.ThanhToans.Add(new ThanhToan
            {
                MaDH = dh.MaDH, SoTien = tong, MaPT = pt,
                TrangThaiTT = daTra ? "Đã thanh toán" : "Chưa thanh toán",
                NgayThanhToan = daTra ? ngay.AddHours(80) : null
            });
            // Lịch sử trạng thái
            void LichSu(DateTime t, int st, int? nguoi, string ghiChu) =>
                db.LichSuDonHangs.Add(new LichSuDonHang { MaDH = dh.MaDH, ThoiGian = t, MaTrangThai = st, MaNguoiDoi = nguoi, GhiChu = ghiChu });
            LichSu(ngay, 1, null, "Khách đặt hàng");
            int last = tt == Const.HUY ? 2 : tt == Const.DOI_TRA ? 5 : tt;
            var nv = rnd.NextDouble() < 0.5 ? staff1.MaTK : staff2.MaTK;
            for (int st = 2; st <= last; st++) LichSu(ngay.AddHours((st - 1) * 6), st, nv, "Cập nhật trạng thái");
            if (tt == Const.HUY) LichSu(ngay.AddHours(4), 6, kh.MaTK, "Hủy đơn: " + dh.LyDoHuy);
            if (tt == Const.DOI_TRA) LichSu(ngay.AddHours(120), 7, nv, "Chấp nhận đổi trả");
            db.SaveChanges();
        }

        // Yêu cầu đổi trả: đơn trạng thái Đổi trả => đã chấp nhận; thêm vài yêu cầu khác cho đơn Hoàn thành
        var doiTraOrders = db.DonHangs.Where(d => d.MaTrangThai == Const.DOI_TRA).ToList();
        foreach (var d in doiTraOrders)
        {
            var g = Const.LY_DO_DOI_TRA[lyDoDT[rnd.Next(lyDoDT.Length)]];
            db.YeuCauDoiTras.Add(new YeuCauDoiTra { MaDH = d.MaDH, MaTK = d.MaTK, NhomLyDo = g, LyDo = g, TrangThai = Const.DT_OK, NgayTao = d.NgayDat.AddDays(6), NgayXuLy = d.NgayDat.AddDays(7), MaNguoiXuLy = staff1.MaTK });
        }
        var hoanThanhGanDay = db.DonHangs.Where(d => d.MaTrangThai == Const.HOAN_THANH && d.NgayDat > now.AddDays(-12)).Take(3).ToList();
        for (int i = 0; i < hoanThanhGanDay.Count; i++)
        {
            var g = Const.LY_DO_DOI_TRA[i == 0 ? 0 : i == 1 ? 2 : 1];
            db.YeuCauDoiTras.Add(new YeuCauDoiTra { MaDH = hoanThanhGanDay[i].MaDH, MaTK = hoanThanhGanDay[i].MaTK, NhomLyDo = g, LyDo = g == "Sai size" ? "Sai size, muốn đổi sang size lớn hơn" : g, TrangThai = i == 2 ? Const.DT_NO : Const.DT_CHO, LyDoTuChoi = i == 2 ? "Sản phẩm có dấu hiệu đã qua sử dụng" : null, NgayTao = now.AddDays(-1 - i), NgayXuLy = i == 2 ? now.AddHours(-5) : null, MaNguoiXuLy = i == 2 ? staff1.MaTK : null });
        }
        // Cập nhật hạng thành viên theo chi tiêu thật
        foreach (var c in customers)
        {
            var chi = (from d in db.DonHangs join t in db.ThanhToans on d.MaDH equals t.MaDH where d.MaTK == c.MaTK && d.MaTrangThai == Const.HOAN_THANH select (decimal?)t.SoTien).Sum() ?? 0;
            c.MaHang = db.HangThanhViens.Where(h => h.ChiTieuToiThieu <= chi).OrderByDescending(h => h.ChiTieuToiThieu).Select(h => h.MaHang).First();
        }
        // Đánh giá mẫu
        var cmts = new[] { "Vải mát, mặc vừa vặn", "Form đẹp, giao nhanh", "Chất lượng tốt so với giá", "Đúng size, màu như hình", "Hơi nhăn nhưng ổn" };
        for (int i = 0; i < 25; i++)
            db.DanhGias.Add(new DanhGia { MaTK = customers[rnd.Next(customers.Count)].MaTK, MaSP = spMap[rnd.Next(spMap.Count)].MaSP, SoSao = rnd.Next(3, 6), NoiDung = cmts[rnd.Next(cmts.Length)], NgayDG = now.AddDays(-rnd.Next(1, 60)) });
        db.SaveChanges();

        // Ghi lịch sử nhập hàng đầu kỳ cho từng biến thể
        foreach (var bt in db.BienThes.ToList())
            db.LsTonKhos.Add(new LsTonKho { MaBT = bt.MaBT, LoaiThaoTac = "Nhập hàng", SoLuongThayDoi = bt.SoLuongTon, TonSau = bt.SoLuongTon, GhiChu = "Nhập hàng đầu kỳ", MaNguoiThucHien = staff1.MaTK, ThoiGian = now.AddDays(-80) });
        db.CauHinhs.Add(new CauHinh { Khoa = "SEED_XONG", GiaTri = "v3" });   // dấu hiệu đã seed trọn vẹn
        db.SaveChanges();
    }
}
