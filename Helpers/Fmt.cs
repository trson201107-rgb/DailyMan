using System.Globalization;

namespace DailyMan.Helpers;

/// <summary>Định dạng hiển thị: tiền, ngày giờ, phần trăm.</summary>
public static class Fmt
{
    public static string Money(decimal v) => ((long)v).ToString("#,##0", CultureInfo.InvariantCulture).Replace(",", ".") + "đ";
    public static string Money(decimal? v) => v.HasValue ? Money(v.Value) : "";
    public static string Short(decimal v)      // 1.250.000 -> 1,25tr (dùng cho nhãn biểu đồ)
    {
        if (v >= 1_000_000) return (v / 1_000_000m).ToString("0.##", CultureInfo.InvariantCulture) + "tr";
        if (v >= 1_000) return (v / 1_000m).ToString("0.#", CultureInfo.InvariantCulture) + "k";
        return ((long)v).ToString();
    }
    public static string Date(DateTime d) => d.ToString("dd/MM/yyyy");
    public static string DateTime(DateTime d) => d.ToString("dd/MM/yyyy HH:mm");
    public static string Pct(double v) => v.ToString("0.#", CultureInfo.InvariantCulture) + "%";
    public static double Rate(int part, int whole) => whole <= 0 ? 0 : Math.Round(part * 100.0 / whole, 1);
}
