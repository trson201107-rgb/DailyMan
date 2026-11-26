using System.Net;

namespace DailyMan.Helpers;

public static class PagerHelper
{
    /// <summary>Tạo URL của trang số <paramref name="page"/>, giữ nguyên các bộ lọc đang có trên query string.</summary>
    public static string Url(HttpRequest req, int page)
    {
        var parts = new List<string>();
        foreach (var kv in req.Query)
        {
            if (kv.Key.Equals("page", StringComparison.OrdinalIgnoreCase)) continue;
            foreach (var v in kv.Value) parts.Add($"{WebUtility.UrlEncode(kv.Key)}={WebUtility.UrlEncode(v ?? "")}");
        }
        parts.Add("page=" + page);
        return req.Path + "?" + string.Join("&", parts);
    }

    /// <summary>Tạo URL hiện tại nhưng bỏ một tham số lọc (dùng cho chip "bỏ lọc").</summary>
    public static string Without(HttpRequest req, string key, string? value = null)
    {
        var parts = new List<string>();
        foreach (var kv in req.Query)
        {
            if (kv.Key.Equals("page", StringComparison.OrdinalIgnoreCase)) continue;
            foreach (var v in kv.Value)
            {
                if (kv.Key.Equals(key, StringComparison.OrdinalIgnoreCase) && (value == null || v == value)) continue;
                parts.Add($"{WebUtility.UrlEncode(kv.Key)}={WebUtility.UrlEncode(v ?? "")}");
            }
        }
        return req.Path + (parts.Count > 0 ? "?" + string.Join("&", parts) : "");
    }
}
