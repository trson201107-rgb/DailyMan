namespace DailyMan.Models;

/// <summary>Hằng số dùng chung toàn hệ thống (sửa ở đây, không rải số "cứng" trong code).</summary>
public static class Const
{
    public const int PAGE_SIZE = 8;            // số sản phẩm / trang phía khách
    public const int ADMIN_PAGE_SIZE = 10;     // số dòng / trang trong trang quản trị
    public const int LOW_STOCK = 10;           // tổng tồn <= ngưỡng này (và > 0) => "Sắp hết hàng"
    public const int NEW_DAYS = 30;            // tạo trong N ngày gần đây => "Mới"
    public const int HOT_MIN_VIEWS = 100;      // lượt xem >= ngưỡng => "Hot"
    public const decimal SHIP_FEE = 30000;
    public const decimal FREE_SHIP_FROM = 1000000;
    public const int MAX_LOGIN_FAIL = 5;
    public const int LOCK_MINUTES = 15;
    public const int RETURN_DAYS = 7;

    // MaTrangThai trong bảng TRANG_THAI_DON
    public const int CHO = 1, XAC_NHAN = 2, DONG_GOI = 3, DANG_GIAO = 4, HOAN_THANH = 5, HUY = 6, DOI_TRA = 7;
    public static readonly string[] TEN_TRANG_THAI = { "", "Chờ xác nhận", "Đã xác nhận", "Đang đóng gói", "Đang giao", "Hoàn thành", "Đã hủy", "Đổi trả" };

    public const string ROLE_CUSTOMER = "Customer", ROLE_STAFF = "Staff", ROLE_ADMIN = "Admin";
    public const string TK_HOAT_DONG = "Hoạt động", TK_KHOA = "Bị khóa";
    public const string SP_BAN = "Đang bán", SP_AN = "Ngừng bán";
    public const string DT_CHO = "Chờ xử lý", DT_OK = "Đã chấp nhận", DT_NO = "Từ chối";

    public const string KM_SU_KIEN = "SuKien", KM_COMBO = "Combo", KM_CAP_BAC = "CapBac";
    public const string GIAM_PHAN_TRAM = "PHAN_TRAM", GIAM_TIEN = "TIEN";
    public static string TenLoaiKM(string loai) => loai switch
    {
        KM_SU_KIEN => "Giảm theo sự kiện",
        KM_COMBO => "Giảm theo combo",
        KM_CAP_BAC => "Giảm theo cấp bậc tài khoản",
        _ => loai
    };

    // Khóa trong bảng CAU_HINH
    public const string CFG_UU_DAI_HANG = "UU_DAI_HANG";                 // 1 = áp dụng ưu đãi hạng thành viên tự động
    public const string CFG_MUC_TIEU_DOANH_THU = "MUC_TIEU_DOANH_THU_THANG";
    public const string CFG_MUC_TIEU_DON = "MUC_TIEU_DON_THANG";

    // Danh sách lý do chọn sẵn (để thống kê "lý do nhiều nhất")
    public static readonly string[] LY_DO_HUY =
    {
        "Đổi ý, không muốn mua nữa", "Đặt nhầm size / màu", "Tìm được nơi bán giá rẻ hơn",
        "Thời gian giao hàng quá lâu", "Muốn thay đổi địa chỉ / thông tin nhận hàng", "Khác"
    };
    public static readonly string[] LY_DO_DOI_TRA =
    {
        "Sai size", "Sản phẩm bị lỗi", "Màu sắc không giống hình", "Giao sai sản phẩm", "Không vừa ý", "Khác"
    };
}
