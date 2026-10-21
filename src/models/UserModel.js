// [BACKEND B] Model tài khoản
const db = require('../config/db');
const C = require('../config/constants');
const { AppError } = require('../utils/errors');
const { likeEsc } = require('../utils/helpers');

const SEL = `SELECT tk.MaTK, tk.HoTen, tk.Email, tk.MatKhauHash, tk.SoDienThoai, tk.TrangThai, tk.SoLanDangNhapSai, tk.NgayTao,
                    tk.MaVaiTro, vt.TenVaiTro, tk.MaHang, ht.TenHang,
                    CASE WHEN tk.KhoaDen IS NOT NULL AND tk.KhoaDen > SYSDATETIME() THEN 1 ELSE 0 END AS DangKhoa,
                    DATEDIFF(MINUTE, SYSDATETIME(), tk.KhoaDen) AS PhutConKhoa
             FROM TAI_KHOAN tk JOIN VAI_TRO vt ON vt.MaVaiTro = tk.MaVaiTro LEFT JOIN HANG_THANH_VIEN ht ON ht.MaHang = tk.MaHang`;

function dupMsg(e) {
  if (![2627, 2601].includes(e.number)) return null;
  return /Email/i.test(e.message) ? 'Email này đã được đăng ký.' : 'Số điện thoại này đã được đăng ký.';
}

module.exports = {
  async findByEmail(email) { return (await db.query(`${SEL} WHERE tk.Email = @email`, { email }))[0]; },
  async findById(id) { return (await db.query(`${SEL} WHERE tk.MaTK = @id`, { id }))[0]; },

  /** Đăng ký: tạo tài khoản Customer + giỏ hàng trong một giao dịch */
  async createCustomer({ hoTen, email, sdt, hash }) {
    try {
      return await db.transaction(async (tx) => {
        const r = await tx.query(
          `INSERT INTO TAI_KHOAN (HoTen, Email, MatKhauHash, SoDienThoai, MaVaiTro, MaHang)
           OUTPUT INSERTED.MaTK
           VALUES (@hoTen, @email, @hash, @sdt,
                   (SELECT MaVaiTro FROM VAI_TRO WHERE TenVaiTro = @role),
                   (SELECT TOP 1 MaHang FROM HANG_THANH_VIEN ORDER BY ChiTieuToiThieu ASC))`,
          { hoTen, email, hash, sdt, role: C.ROLE.CUSTOMER });
        await tx.run('INSERT INTO GIO_HANG (MaTK) VALUES (@id)', { id: r[0].MaTK });
        return r[0].MaTK;
      });
    } catch (e) { const m = dupMsg(e); if (m) throw new AppError(m); throw e; }
  },

  // Sai mật khẩu: tăng bộ đếm; đủ số lần thì khóa tạm (tính giờ bằng SQL để không lệch múi giờ)
  failLogin(id) {
    return db.run(`UPDATE TAI_KHOAN SET
        KhoaDen = CASE WHEN SoLanDangNhapSai + 1 >= @max THEN DATEADD(MINUTE, @min, SYSDATETIME()) ELSE KhoaDen END,
        SoLanDangNhapSai = CASE WHEN SoLanDangNhapSai + 1 >= @max THEN 0 ELSE SoLanDangNhapSai + 1 END
      WHERE MaTK = @id`, { id, max: C.MAX_LOGIN_FAIL, min: C.LOCK_MINUTES });
  },
  resetLogin(id) { return db.run('UPDATE TAI_KHOAN SET SoLanDangNhapSai = 0, KhoaDen = NULL WHERE MaTK = @id', { id }); },

  async updateProfile(id, { hoTen, sdt }) {
    try { await db.run('UPDATE TAI_KHOAN SET HoTen=@hoTen, SoDienThoai=@sdt WHERE MaTK=@id', { id, hoTen, sdt }); }
    catch (e) { const m = dupMsg(e); if (m) throw new AppError(m); throw e; }
  },
  updatePassword(id, hash) { return db.run('UPDATE TAI_KHOAN SET MatKhauHash=@hash WHERE MaTK=@id', { id, hash }); },

  /** Tổng chi tiêu (chỉ đơn Hoàn thành) và hạng thành viên tương ứng */
  async spending(id) {
    const r = (await db.query(`SELECT ISNULL(SUM(v.TongThanhToan), 0) AS Tong FROM DON_HANG dh
                               JOIN vw_TongTienDonHang v ON v.MaDH = dh.MaDH WHERE dh.MaTK=@id AND dh.MaTrangThai=@st`, { id, st: C.STATUS.HOAN_THANH }))[0];
    const h = (await db.query(`SELECT TOP 1 TenHang, PhanTramUuDai FROM HANG_THANH_VIEN WHERE ChiTieuToiThieu <= @t ORDER BY ChiTieuToiThieu DESC`, { t: r.Tong }))[0];
    return { tong: r.Tong, hang: h };
  },

  // ---- Quản trị tài khoản ----
  async search({ q, role }, { offset, size }) {
    const w = []; const p = {};
    if (q) { w.push('(tk.HoTen LIKE @q OR tk.Email LIKE @q OR tk.SoDienThoai LIKE @q)'); p.q = likeEsc(q); }
    if (role) { w.push('vt.TenVaiTro = @role'); p.role = role; }
    const where = w.length ? 'WHERE ' + w.join(' AND ') : '';
    const total = (await db.query(`SELECT COUNT(*) AS n FROM TAI_KHOAN tk JOIN VAI_TRO vt ON vt.MaVaiTro = tk.MaVaiTro ${where}`, p))[0].n;
    const items = await db.query(`${SEL} ${where} ORDER BY tk.MaTK OFFSET @off ROWS FETCH NEXT @lim ROWS ONLY`, { ...p, off: offset, lim: size });
    return { items, total };
  },
  setRole(id, role) {
    return db.run('UPDATE TAI_KHOAN SET MaVaiTro = (SELECT MaVaiTro FROM VAI_TRO WHERE TenVaiTro = @role) WHERE MaTK = @id', { id, role });
  },
  setStatus(id, status) {
    return db.run('UPDATE TAI_KHOAN SET TrangThai=@status, SoLanDangNhapSai=0, KhoaDen=NULL WHERE MaTK=@id', { id, status });
  }
};
