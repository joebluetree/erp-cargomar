using Microsoft.EntityFrameworkCore;
using iErp.Admin.Notification;
using iErp.Data;

namespace iErp.Tests.Unit;

/// <summary>
/// The latest-notification query as SQL for Oracle, generated without a database. Oracle 10g has no TRUE/FALSE
/// literals, so the null flags of the order must be numbers.
/// </summary>
public class NotificationQueryTests
{
    private static AppDbContext Db() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseOracle("User Id=model;Password=model;Data Source=localhost:1521/model")
            .AddInterceptors(new Oracle10gCompatibilityInterceptor()).Options);

    [Fact]
    public void Reads_only_visible_GENINFO_rows_with_a_banner_or_heading_latest_first_with_nulls_last()
    {
        var sql = new NotificationRepository(Db()).Latest().ToQueryString();

        Assert.DoesNotMatch(@"\b(TRUE|FALSE)\b", sql);
        Assert.Contains("FROM \"GENINFO\"", sql);
        // Only VISIBLE 'Y' (either case), as one IN list; the SQL may wrap the strings in a PL/SQL literal, doubling
        // their quotes.
        Assert.Matches("\"VISIBLE\" IN \\(N?'+Y'+, N?'+y'+\\)", sql);
        Assert.Contains("\"BANNER\" IS NOT NULL", sql);
        Assert.Matches(@"TRIM\(""g"".""BANNER""\)", sql);
        Assert.Contains("\"HEADING\" IS NOT NULL", sql);
        Assert.Matches(@"TRIM\(""g"".""HEADING""\)", sql);
        Assert.Contains(" OR ", sql);
        // Dated rows first, newest first; then rows with an id, highest first.
        Assert.Matches(
            @"ORDER BY CASE\s+WHEN ""g"".""REC_CREATED_DATE"" IS NULL THEN 1\s+ELSE 0\s+END, ""g"".""REC_CREATED_DATE"" DESC, CASE\s+WHEN ""g"".""ID"" IS NULL THEN 1\s+ELSE 0\s+END, ""g"".""ID"" DESC",
            sql);
    }
}
