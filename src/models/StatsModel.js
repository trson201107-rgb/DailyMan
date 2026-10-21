// [BACKEND B] Model thống kê cho Dashboard (tính từ dữ liệu đơn hàng thực tế)
const db = require('../config/db');
const C = require('../config/constants');

const THANG = `DATEFROMPARTS(YEAR(SYSDATETIME()), MONTH(SYSDATETIME()), 1)`;

module.exports = {
  async summary() {
    const q = async (sql, p) => (await db.query(sql, p))[0];
    const [dt, don, kh, kho, cho] = await Promise.all([
      q(`SELECT ISNULL(SUM(v.TongThanhToan),0) AS n FROM DON_HANG dh JOIN vw_TongTienDonHang v ON v.MaDH=dh.MaDH
         WHERE dh.MaTrangThai=@ht AND dh.NgayDat >= ${THANG}`, { ht: C.STATUS.HOAN_THANH }),
      q(`SELECT COUNT(*) AS n FROM DON_HANG WHERE NgayDat >= ${THANG} AND MaTrangThai <> @huy`, { huy: C.STATUS.HUY }),
      q(`SELECT COUNT(*) AS n FROM TAI_KHOAN tk JOIN VAI_TRO vt ON vt.MaVaiTro=tk.MaVaiTro WHERE vt.TenVaiTro=@r AND tk.NgayTao >= ${THANG}`, { r: C.ROLE.CUSTOMER }),
      q(`SELECT SUM(CASE WHEN ISNULL(t.TongTon,0)=0 THEN 1 ELSE 0 END) AS hetHang,
                SUM(CASE WHEN ISNULL(t.TongTon,0) BETWEEN 1 AND ${C.LOW_STOCK} THEN 1 ELSE 0 END) AS sapHet
         FROM SAN_PHAM sp LEFT JOIN (SELECT MaSP, SUM(SoLuongTon) AS TongTon FROM BIEN_THE GROUP BY MaSP) t ON t.MaSP=sp.MaSP
         WHERE sp.TrangThai=@bn`, { bn: C.SP.BAN }),
      q('SELECT COUNT(*) AS n FROM DON_HANG WHERE MaTrangThai=@cho', { cho: C.STATUS.CHO })
    ]);
    return { doanhThuThang: dt.n, donThang: don.n, khachMoi: kh.n, hetHang: kho.hetHang || 0, sapHet: kho.sapHet || 0, choXuLy: cho.n };
  },
  revenue7days() {
    return db.query(`;WITH d AS (SELECT CAST(DATEADD(DAY, -n, SYSDATETIME()) AS DATE) AS Ngay FROM (VALUES (0),(1),(2),(3),(4),(5),(6)) x(n))
      SELECT d.Ngay, ISNULL(SUM(v.TongThanhToan),0) AS DoanhThu
      FROM d LEFT JOIN DON_HANG dh ON CAST(dh.NgayDat AS DATE) = d.Ngay AND dh.MaTrangThai = @ht
             LEFT JOIN vw_TongTienDonHang v ON v.MaDH = dh.MaDH
      GROUP BY d.Ngay ORDER BY d.Ngay`, { ht: C.STATUS.HOAN_THANH });
  },
  bestSellers(limit = 5) {
    return db.query(`SELECT TOP (@lim) sp.MaSP, sp.TenSP, SUM(ct.SoLuong) AS DaBan
                     FROM CHI_TIET_DON_HANG ct JOIN DON_HANG dh ON dh.MaDH = ct.MaDH
                     JOIN BIEN_THE bt ON bt.MaBT = ct.MaBT JOIN SAN_PHAM sp ON sp.MaSP = bt.MaSP
                     WHERE dh.MaTrangThai <> @huy GROUP BY sp.MaSP, sp.TenSP ORDER BY SUM(ct.SoLuong) DESC`, { lim: limit, huy: C.STATUS.HUY });
  },
  recentOrders(limit = 5) {
    return db.query(`SELECT TOP (@lim) dh.MaDH, dh.NgayDat, dh.TenNguoiNhan, tt.TenTrangThai, dh.MaTrangThai, v.TongThanhToan
                     FROM DON_HANG dh JOIN TRANG_THAI_DON tt ON tt.MaTrangThai=dh.MaTrangThai JOIN vw_TongTienDonHang v ON v.MaDH=dh.MaDH
                     ORDER BY dh.NgayDat DESC, dh.MaDH DESC`, { lim: limit });
  },
  lowStockVariants(limit = 6) {
    return db.query(`SELECT TOP (@lim) bt.SKU, bt.SoLuongTon, sp.MaSP, sp.TenSP FROM BIEN_THE bt JOIN SAN_PHAM sp ON sp.MaSP = bt.MaSP
                     WHERE sp.TrangThai=@bn AND bt.SoLuongTon <= 3 ORDER BY bt.SoLuongTon, sp.TenSP`, { lim: limit, bn: C.SP.BAN });
  }
};
