using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using iErp.Data;
using iErp.Entities;

namespace iErp.Tests.Integration;

/// <summary>
/// Needs IERP_TEST_ORACLE. COMPANYM is an existing, externally owned table. If the test schema already has one,
/// the test only reads it (it never writes to a real table); otherwise it creates a COMPANYM-shaped table, checks
/// the mapping and that migrations leave it alone, and drops it again. Either way it pages through the table, which
/// proves the OFFSET/FETCH to ROWNUM rewrite on the target Oracle version.
/// </summary>
public class CompanyTableTests
{
    private const string TableExistsSql =
        "SELECT COUNT(*) AS \"Value\" FROM USER_TABLES WHERE TABLE_NAME = 'COMPANYM'";

    private static IQueryable<Company> Ordered(AppDbContext db) =>
        db.Set<Company>().AsNoTracking().OrderBy(c => c.Name).ThenBy(c => c.Id);

    /// <summary>Pages through every row and checks totals, no overlap, no gaps, order and the page after the last.</summary>
    private static async Task AssertPagingAsync(AppDbContext db, int pageSize)
    {
        var all = await Ordered(db).ToListAsync();
        Assert.NotEmpty(all);

        var seen = new List<string>();
        var pages = (int)Math.Ceiling(all.Count / (double)pageSize);
        for (var page = 1; page <= pages; page++)
        {
            var (items, total) = await Ordered(db).ToPageAsync(page, pageSize);
            Assert.Equal(all.Count, total);
            Assert.Equal(Math.Min(pageSize, all.Count - (page - 1) * pageSize), items.Count);
            seen.AddRange(items.Select(i => i.Id));
        }

        Assert.Equal(all.Select(c => c.Id), seen);

        var (beyond, beyondTotal) = await Ordered(db).ToPageAsync(pages + 1, pageSize);
        Assert.Empty(beyond);
        Assert.Equal(all.Count, beyondTotal);
    }

    [OracleFact]
    public async Task Companies_are_read_through_the_mapping_and_migrations_leave_the_table_alone()
    {
        using var factory = new ApiFactory();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var existed = (await db.Database.SqlQueryRaw<decimal>(TableExistsSql).ToListAsync()).Single() > 0;
        if (existed)
        {
            // Real table: read only. Proves the column mapping and the paging rewrite against the actual schema.
            var rows = await db.Set<Company>().AsNoTracking()
                .Where(c => c.Type == "C" && c.DeletedDate == null)
                .OrderBy(c => c.Name).ToListAsync();
            Assert.All(rows, c => Assert.False(string.IsNullOrEmpty(c.Id)));

            await AssertPagingAsync(db, 5);
            await AssertPagingAsync(db, 10);
            await AssertPagingAsync(db, 100);
            return;
        }

        await db.Database.ExecuteSqlRawAsync(@"CREATE TABLE COMPANYM (
            COMP_PKID NVARCHAR2(40) NOT NULL PRIMARY KEY, COMP_TYPE CHAR(1), COMP_PARENT_ID NVARCHAR2(40), COMP_CODE NVARCHAR2(10),
            COMP_NAME NVARCHAR2(60), COMP_ADDRESS1 NVARCHAR2(60), COMP_ADDRESS2 NVARCHAR2(60),
            COMP_ADDRESS3 NVARCHAR2(60), COMP_TEL NVARCHAR2(60), COMP_EMAIL NVARCHAR2(60),
            COMP_WEB NVARCHAR2(60), REC_DELETED_DATE DATE)");
        try
        {
            await db.Database.ExecuteSqlRawAsync(
                "INSERT INTO COMPANYM (COMP_PKID, COMP_TYPE, COMP_CODE, COMP_NAME, COMP_ADDRESS1) VALUES ('not-a-guid-1', 'C', 'B1', 'Beta', 'Road 1')");
            await db.Database.ExecuteSqlRawAsync(
                "INSERT INTO COMPANYM (COMP_PKID, COMP_TYPE, COMP_CODE, COMP_NAME) VALUES ('not-a-guid-2', 'C', 'A1', 'Alpha')");
            await db.Database.ExecuteSqlRawAsync(
                "INSERT INTO COMPANYM (COMP_PKID, COMP_TYPE, COMP_CODE, COMP_NAME) VALUES ('branch-1', 'B', 'BR1', 'Branch')");
            await db.Database.ExecuteSqlRawAsync(
                "INSERT INTO COMPANYM (COMP_PKID, COMP_TYPE, COMP_CODE, COMP_NAME, REC_DELETED_DATE) VALUES ('deleted-1', 'C', 'D1', 'Deleted', SYSDATE)");
            // Two rows with the same name: the id breaks the tie, so pages never overlap or skip.
            await db.Database.ExecuteSqlRawAsync(
                "INSERT INTO COMPANYM (COMP_PKID, COMP_TYPE, COMP_CODE, COMP_NAME) VALUES ('twin-b', 'C', 'T2', 'Twin')");
            await db.Database.ExecuteSqlRawAsync(
                "INSERT INTO COMPANYM (COMP_PKID, COMP_TYPE, COMP_CODE, COMP_NAME) VALUES ('twin-a', 'C', 'T1', 'Twin')");

            // Migrations must neither fail on nor change the existing table.
            await db.Database.MigrateAsync();

            var companies = await db.Set<Company>().AsNoTracking()
                .Where(c => c.Type == "C" && c.DeletedDate == null && c.Name != "Twin")
                .OrderBy(c => c.Name).ToListAsync();

            Assert.Equal(["not-a-guid-2", "not-a-guid-1"], companies.Select(c => c.Id));
            Assert.Null(companies[0].Address1);
            Assert.Equal("Road 1", companies[1].Address1);
            Assert.Equal(6, await db.Set<Company>().CountAsync());

            await AssertPagingAsync(db, 2);
            await AssertPagingAsync(db, 5);
        }
        finally
        {
            await db.Database.ExecuteSqlRawAsync("DROP TABLE COMPANYM");
        }
    }
}
