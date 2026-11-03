// [BACKEND B] Model hạng thành viên + cấu hình ưu đãi (UC15)
const db = require('../config/db');
const { AppError } = require('../utils/errors');

// Cập nhật hạng của khách theo tổng chi tiêu (chỉ tính đơn Hoàn thành). where: điều kiện thêm, vd 'AND tk.MaTK = @maTK'
const recomputeSql = (where = '') => `
  UPDATE tk SET MaHang = (
      SELECT TOP 1 ht.MaHang FROM HANG_THANH_VIEN ht
      WHERE ht.ChiTieuToiThieu <= ISNULL((SELECT SUM(v.TongThanhToan) FROM DON_HANG d JOIN vw_TongTienDonHang v ON v.MaDH = d.MaDH
                                          WHERE d.MaTK = tk.MaTK AND d.MaTrangThai = 5), 0)
      ORDER BY ht.ChiTieuToiThieu DESC)
  FROM TAI_KHOAN tk JOIN VAI_TRO vt ON vt.MaVaiTro = tk.MaVaiTro
  WHERE vt.TenVaiTro = N'Customer' ${where}`;

const KEY = 'UU_DAI_HANG';

module.exports = {
  recomputeSql,
  list() {
    return db.query(`SELECT ht.MaHang, ht.TenHang, ht.ChiTieuToiThieu, ht.PhanTramUuDai,
                            (SELECT COUNT(*) FROM TAI_KHOAN tk WHERE tk.MaHang = ht.MaHang) AS SoKhach
                     FROM HANG_THANH_VIEN ht ORDER BY ht.ChiTieuToiThieu`);
  },
  async enabled(ex = db) {
    const r = await ex.query('SELECT GiaTri FROM CAU_HINH WHERE Khoa = @k', { k: KEY });
    return !!r[0] && r[0].GiaTri === '1';
  },
  async setEnabled(on) {
    await db.run(`IF EXISTS (SELECT 1 FROM CAU_HINH WHERE Khoa = @k)
                  BEGIN
                    UPDATE CAU_HINH SET GiaTri = @v WHERE Khoa = @k;
                  END
                  ELSE
                  BEGIN
                    INSERT INTO CAU_HINH (Khoa, GiaTri) VALUES (@k, @v);
                  END`, { k: KEY, v: on ? '1' : '0' });
  },
  /** Ưu đãi hạng thành viên cho khách ở mức tiền hàng cho trước (0 nếu tính năng đang tắt). ex = db hoặc tx */
  async uuDai(ex, maTK, tienHang) {
    if (!(await this.enabled(ex))) return { bat: false, pct: 0, giam: 0, ten: null };
    const r = (await ex.query(`SELECT ht.TenHang, ht.PhanTramUuDai FROM TAI_KHOAN tk JOIN HANG_THANH_VIEN ht ON ht.MaHang = tk.MaHang WHERE tk.MaTK = @maTK`, { maTK }))[0];
    if (!r) return { bat: true, pct: 0, giam: 0, ten: null };
    return { bat: true, pct: r.PhanTramUuDai, giam: Math.floor((tienHang * r.PhanTramUuDai) / 100), ten: r.TenHang };
  },
  /** Cấu hình các hạng: ngưỡng chi tiêu tăng dần, hạng thấp nhất bắt đầu từ 0, ưu đãi 0–50% */
  async saveAll(rows) {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.ten || !r.ten.trim()) throw new AppError(`Hạng thứ ${i + 1}: tên không được để trống.`);
      if (!Number.isInteger(r.chiTieu) || r.chiTieu < 0) throw new AppError(`Hạng "${r.ten}": chi tiêu tối thiểu phải là số nguyên >= 0.`);
      if (!Number.isInteger(r.pct) || r.pct < 0 || r.pct > 50) throw new AppError(`Hạng "${r.ten}": ưu đãi phải từ 0 đến 50%.`);
      if (i === 0 && r.chiTieu !== 0) throw new AppError('Hạng thấp nhất phải có chi tiêu tối thiểu bằng 0.');
      if (i > 0 && r.chiTieu <= rows[i - 1].chiTieu) throw new AppError('Chi tiêu tối thiểu của các hạng phải tăng dần.');
    }
    await db.transaction(async (tx) => {
      for (const r of rows) {
        await tx.run('UPDATE HANG_THANH_VIEN SET TenHang=@ten, ChiTieuToiThieu=@chiTieu, PhanTramUuDai=@pct WHERE MaHang=@id',
          { id: r.id, ten: r.ten.trim().slice(0, 30), chiTieu: r.chiTieu, pct: r.pct });
      }
    });
  },
  async recomputeAll() { const r = await db.run(recomputeSql()); return r.rowsAffected[0]; }
};
