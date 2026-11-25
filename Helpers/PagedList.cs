using Microsoft.EntityFrameworkCore;

namespace DailyMan.Helpers;

/// <summary>Danh sách đã phân trang (Tuần 7: Paging).</summary>
public class PagedList<T>
{
    public List<T> Items { get; init; } = new();
    public int Page { get; init; }
    public int PageSize { get; init; }
    public int Total { get; init; }
    public int TotalPages => Math.Max(1, (int)Math.Ceiling(Total / (double)PageSize));

    public static async Task<PagedList<T>> CreateAsync(IQueryable<T> query, int page, int pageSize)
    {
        var total = await query.CountAsync();
        var pages = Math.Max(1, (int)Math.Ceiling(total / (double)pageSize));
        page = Math.Min(Math.Max(1, page), pages);
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return new PagedList<T> { Items = items, Page = page, PageSize = pageSize, Total = total };
    }
}
