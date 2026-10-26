using Microsoft.EntityFrameworkCore;
using iErp.Admin.Login;
using iErp.Data;

namespace iErp.Tests.Unit;

/// <summary>
/// The APPDETAILS read as SQL for Oracle, generated without a database. Oracle 10g has no TRUE/FALSE literals and no
/// FETCH FIRST, which the compatibility interceptor rewrites only at the top level of a query.
/// </summary>
public class AppDetailQueryTests
{
    [Fact]
    public void Reads_the_rows_of_the_trimmed_app_id_with_no_bool_literal_and_no_row_limit()
    {
        var repository = new LoginRepository(new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseOracle("User Id=model;Password=model;Data Source=localhost:1521/model")
            .AddInterceptors(new Oracle10gCompatibilityInterceptor()).Options));

        var sql = repository.AppDetailRows("  a-1  ").ToQueryString();

        Assert.DoesNotMatch(@"\b(TRUE|FALSE)\b", sql);
        Assert.Contains("\"APPDETAILS\"", sql);
        Assert.Contains("\"USER_APPID\"", sql);
        Assert.Contains("a-1", sql);
        Assert.DoesNotContain("  a-1", sql);
        // No row limit: a Take is sent as a bind (FETCH FIRST :p ROWS ONLY), which the Oracle 10g rewrite does not handle.
        Assert.DoesNotContain("FETCH", sql);
    }
}
