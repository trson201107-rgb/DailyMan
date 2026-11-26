using Npgsql;

namespace DailyMan.Helpers;

/// <summary>Nhận diện loại CSDL từ chuỗi kết nối và chuyển URL của Render (postgresql://...) sang dạng Npgsql hiểu.</summary>
public static class DbProvider
{
    public static bool IsPostgres(string cs) =>
        cs.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase)
        || cs.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase)
        || cs.Contains("Host=", StringComparison.OrdinalIgnoreCase);

    public static string ToNpgsql(string cs)
    {
        if (!cs.StartsWith("postgres", StringComparison.OrdinalIgnoreCase) || !cs.Contains("://")) return cs;   // đã là dạng Host=...;
        var u = new Uri(cs);
        var info = u.UserInfo.Split(':', 2);
        return new NpgsqlConnectionStringBuilder
        {
            Host = u.Host,
            Port = u.Port > 0 ? u.Port : 5432,
            Database = u.AbsolutePath.TrimStart('/'),
            Username = Uri.UnescapeDataString(info[0]),
            Password = info.Length > 1 ? Uri.UnescapeDataString(info[1]) : "",
            SslMode = SslMode.Prefer,
            TrustServerCertificate = true
        }.ConnectionString;
    }
}
