using Microsoft.EntityFrameworkCore;

namespace iErp.Data;

/// <summary>Backend paging for table queries.</summary>
public static class PagingExtensions
{
    /// <summary>
    /// One page of the query. The provider writes <c>OFFSET :p ROWS FETCH NEXT :p ROWS ONLY</c>, which Oracle 10.2
    /// does not have; <see cref="Oracle10gCompatibilityInterceptor"/> rewrites it to the <c>ROWNUM</c> form.
    /// The query must already be ordered by a unique key, or pages can overlap or skip rows.
    /// </summary>
    public static IQueryable<T> ForPage<T>(this IQueryable<T> query, int page, int pageSize)
    {
        ArgumentOutOfRangeException.ThrowIfLessThan(page, 1);
        ArgumentOutOfRangeException.ThrowIfLessThan(pageSize, 1);
        return query.Skip(checked((page - 1) * pageSize)).Take(pageSize);
    }

    /// <summary>
    /// Runs the count and, only when the page can have rows, the page query. A page after the last returns no rows
    /// and the correct total.
    /// </summary>
    public static async Task<(IReadOnlyList<T> Items, int Total)> ToPageAsync<T>(
        this IQueryable<T> query, int page, int pageSize, CancellationToken ct = default)
    {
        var total = await query.CountAsync(ct);
        var offset = (long)(page - 1) * pageSize;
        if (total == 0 || offset >= total) return ([], total);
        return (await query.ForPage(page, pageSize).ToListAsync(ct), total);
    }
}
