// [BACKEND B] Model thống kê cho Dashboard (tính từ dữ liệu đơn hàng thực tế, theo khoảng ngày tùy chọn)
const db = require('../config/db');
const C = require('../config/constants');

// Doanh thu chỉ tính đơn Hoàn thành; số đơn không tính đơn Đã hủy và Đổi trả
const NOT_COUNTED = `(${C.STATUS.HUY}, ${C.STATUS.DOI_TRA})`;
const IN_RANGE = (col) => `CAST(${col} AS DATE) BETWEEN CAST(@tu AS DATE) AND CAST(@den AS DATE)`;

module.exports = {
  /** Ngày hiện tại theo đồng hồ của máy chủ CSDL (cùng nguồn với cột NgayDat) */
  async today() { return (await db.query('SELECT CAST(SYSDATETIME() AS DATE) AS d'))[0].d; },
  async summary({ tu, den }) {
    const q = async (sql, p) => (await db.query(sql, p))[0];
    const r = { tu, den };
    const [dt, don, kh, kho, cho, doiTra] = await Promise.all([
      q(`SELECT ISNULL(SUM(v.TongThanhToan),0) AS n FROM DON_HANG dh JOIN vw_TongTienDonHang v ON v.MaDH=dh.MaDH
         WHERE dh.MaTrangThai=@ht AND ${IN_RANGE('dh.NgayDat')}`, { ...r, ht: C.STATUS.HOAN_THANH }),
      q(`SELECT COUNT(*) AS n FROM DON_HANG dh WHERE ${IN_RANGE('dh.NgayDat')} AND dh.MaTrangThai NOT IN ${NOT_COUNTED}`, r),
      q(`SELECT COUNT(*) AS n FROM TAI_KHOAN tk JOIN VAI_TRO vt ON vt.MaVaiTro=tk.MaVaiTro WHERE vt.TenVaiTro=@r AND ${IN_RANGE('tk.NgayTao')}`, { ...r, r: C.ROLE.CUSTOMER }),
      q(`SELECT SUM(CASE WHEN ISNULL(t.TongTon,0)=0 THEN 1 ELSE 0 END) AS hetHang,
                SUM(CASE WHEN ISNULL(t.TongTon,0) BETWEEN 1 AND ${C.LOW_STOCK} THEN 1 ELSE 0 END) AS sapHet
         FROM SAN_PHAM sp LEFT JOIN (SELECT MaSP, SUM(SoLuongTon) AS TongTon FROM BIEN_THE GROUP BY MaSP) t ON t.MaSP=sp.MaSP
         WHERE sp.TrangThai=@bn`, { bn: C.SP.BAN }),
      q('SELECT COUNT(*) AS n FROM DON_HANG WHERE MaTrangThai=@cho', { cho: C.STATUS.CHO }),
      q('SELECT COUNT(*) AS n FROM YEU_CAU_DOI_TRA WHERE TrangThai=@c', { c: C.RETURN.CHO })
    ]);
    return { doanhThu: dt.n, donHang: don.n, khachMoi: kh.n, hetHang: kho.hetHang || 0, sapHet: kho.sapHet || 0, choXuLy: cho.n, doiTraCho: doiTra.n };
  },
  /** Doanh thu theo từng ngày trong khoảng (ngày không có đơn vẫn có dòng 0, biểu đồ không bị thủng) */
  revenueDaily({ tu, den }) {
    return db.query(`;WITH d AS (SELECT CAST(@tu AS DATE) AS Ngay UNION ALL SELECT DATEADD(DAY, 1, Ngay) FROM d WHERE Ngay < CAST(@den AS DATE))
      SELECT d.Ngay, ISNULL(SUM(v.TongThanhToan),0) AS DoanhThu
      FROM d LEFT JOIN DON_HANG dh ON CAST(dh.NgayDat AS DATE) = d.Ngay AND dh.MaTrangThai = @ht
             LEFT JOIN vw_TongTienDonHang v ON v.MaDH = dh.MaDH
      GROUP BY d.Ngay ORDER BY d.Ngay OPTION (MAXRECURSION 400)`, { tu, den, ht: C.STATUS.HOAN_THANH });
  },
  bestSellers({ tu, den }, limit = 5) {
    return db.query(`SELECT TOP (@lim) sp.MaSP, sp.TenSP, SUM(ct.SoLuong) AS DaBan
                     FROM CHI_TIET_DON_HANG ct JOIN DON_HANG dh ON dh.MaDH = ct.MaDH
                     JOIN BIEN_THE bt ON bt.MaBT = ct.MaBT JOIN SAN_PHAM sp ON sp.MaSP = bt.MaSP
                     WHERE dh.MaTrangThai NOT IN ${NOT_COUNTED} AND ${IN_RANGE('dh.NgayDat')}
                     GROUP BY sp.MaSP, sp.TenSP ORDER BY SUM(ct.SoLuong) DESC`, { lim: limit, tu, den });
  },
  recentOrders({ tu, den }, limit = 5) {
    return db.query(`SELECT TOP (@lim) dh.MaDH, dh.NgayDat, dh.TenNguoiNhan, tt.TenTrangThai, dh.MaTrangThai, v.TongThanhToan
                     FROM DON_HANG dh JOIN TRANG_THAI_DON tt ON tt.MaTrangThai=dh.MaTrangThai JOIN vw_TongTienDonHang v ON v.MaDH=dh.MaDH
                     WHERE ${IN_RANGE('dh.NgayDat')} ORDER BY dh.NgayDat DESC, dh.MaDH DESC`, { lim: limit, tu, den });
  },
  lowStockVariants(limit = 6) {
    return db.query(`SELECT TOP (@lim) bt.SKU, bt.SoLuongTon, sp.MaSP, sp.TenSP FROM BIEN_THE bt JOIN SAN_PHAM sp ON sp.MaSP = bt.MaSP
                     WHERE sp.TrangThai=@bn AND bt.SoLuongTon <= 3 ORDER BY bt.SoLuongTon, sp.TenSP`, { lim: limit, bn: C.SP.BAN });
  }
};
