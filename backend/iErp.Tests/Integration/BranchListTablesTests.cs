using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using iErp.Data;
using iErp.Entities;
using iErp.Reports.BranchList;

namespace iErp.Tests.Integration;

/// <summary>
/// Needs IERP_TEST_ORACLE. COMPANYM is an existing, externally owned table. If the test schema has one, the test only
/// reads it; otherwise it creates a COMPANYM-shaped table, checks the Branch List queries (company scope, filters, order,
/// paging and the listed-branch lookup) and drops it again. Never point IERP_TEST_ORACLE at the dev database.
/// </summary>
public class BranchListTablesTests
{
    private const string TableExistsSql =
        "SELECT COUNT(*) AS \"Value\" FROM USER_TABLES WHERE TABLE_NAME = 'COMPANYM'";

    [OracleFact]
    public async Task The_company_scope_filters_order_and_paging_work_through_the_mapping()
    {
        using var factory = new ApiFactory();
        using var services = factory.Services.CreateScope();
        var db = services.ServiceProvider.GetRequiredService<AppDbContext>();
        var repository = new BranchListRepository(db);

        var existed = (await db.Database.SqlQueryRaw<decimal>(TableExistsSql).ToListAsync()).Single() > 0;
        if (existed)
        {
            // Real table: read only. Every listed row of a company is one of its live branches, and paging covers all.
            var company = await db.Set<Company>().AsNoTracking().Where(c => c.Type == "C").OrderBy(c => c.Id).FirstAsync();
            var (items, total) = await repository.ListAsync(new BranchListQuery { PageSize = 100 }, company.Id);
            Assert.Equal(Math.Min(100, total), items.Count);
            Assert.All(items, b => Assert.Equal(("B", company.Id, (DateTime?)null), (b.Type, b.ParentId, b.DeletedDate)));
            return;
        }

        await db.Database.ExecuteSqlRawAsync(@"CREATE TABLE COMPANYM (
            COMP_PKID NVARCHAR2(40) NOT NULL PRIMARY KEY, COMP_TYPE CHAR(1), COMP_PARENT_ID NVARCHAR2(40), COMP_CODE NVARCHAR2(10),
            COMP_NAME NVARCHAR2(60), COMP_ADDRESS1 NVARCHAR2(60), COMP_ADDRESS2 NVARCHAR2(60),
            COMP_ADDRESS3 NVARCHAR2(60), COMP_TEL NVARCHAR2(60), COMP_EMAIL NVARCHAR2(60),
            COMP_WEB NVARCHAR2(60), REC_DELETED_DATE DATE)");
        try
        {
            string[] rows =
            [
                "INSERT INTO COMPANYM (COMP_PKID, COMP_TYPE, COMP_CODE, COMP_NAME) VALUES ('c-1', 'C', 'CPL', 'Cargomar')",
                "INSERT INTO COMPANYM (COMP_PKID, COMP_TYPE, COMP_CODE, COMP_NAME) VALUES ('c-2', 'C', 'SGT', 'Other company')",
                "INSERT INTO COMPANYM (COMP_PKID, COMP_TYPE, COMP_PARENT_ID, COMP_CODE, COMP_NAME) VALUES ('b-1', 'B', 'c-1', 'COKSF', 'Kochi')",
                "INSERT INTO COMPANYM (COMP_PKID, COMP_TYPE, COMP_PARENT_ID, COMP_CODE, COMP_NAME) VALUES ('b-2', 'B', 'c-1', 'BLRAF', 'Bangalore')",
                "INSERT INTO COMPANYM (COMP_PKID, COMP_TYPE, COMP_PARENT_ID, COMP_CODE, COMP_NAME) VALUES ('b-3', 'B', 'c-1', 'CHESF', 'Bangalore')",
                "INSERT INTO COMPANYM (COMP_PKID, COMP_TYPE, COMP_PARENT_ID, COMP_CODE, COMP_NAME) VALUES ('b-4', 'B', 'c-1', 'AB_1', 'Branch 100%')",
                "INSERT INTO COMPANYM (COMP_PKID, COMP_TYPE, COMP_PARENT_ID, COMP_CODE, COMP_NAME, REC_DELETED_DATE) VALUES ('b-5', 'B', 'c-1', 'OLD', 'Closed', DATE '2020-01-01')",
                "INSERT INTO COMPANYM (COMP_PKID, COMP_TYPE, COMP_PARENT_ID, COMP_CODE, COMP_NAME) VALUES ('b-6', 'B', 'c-2', 'COKSG', 'Other Kochi')",
            ];
            foreach (var sql in rows)
                await db.Database.ExecuteSqlRawAsync(sql);

            // The company's live branches only, by name then id; no company rows, no other company, no deleted branch.
            var (all, total) = await repository.ListAsync(new BranchListQuery(), "c-1");
            Assert.Equal(["b-2", "b-3", "b-4", "b-1"], all.Select(b => b.Id));
            Assert.Equal(4, total);

            // Paging: two pages of two, no overlap.
            var (page2, _) = await repository.ListAsync(new BranchListQuery { Page = 2, PageSize = 2 }, "c-1");
            Assert.Equal(["b-4", "b-1"], page2.Select(b => b.Id));

            // Filters: case-insensitive contains; % and _ are ordinary characters.
            Assert.Equal(["b-1"], (await repository.ListAsync(new BranchListQuery { Code = "cok" }, "c-1")).Items.Select(b => b.Id));
            Assert.Equal(["b-4"], (await repository.ListAsync(new BranchListQuery { Code = "B_1" }, "c-1")).Items.Select(b => b.Id));
            Assert.Equal(["b-4"], (await repository.ListAsync(new BranchListQuery { Name = "100%" }, "c-1")).Items.Select(b => b.Id));
            Assert.Equal(["b-2", "b-3"], (await repository.ListAsync(new BranchListQuery { Name = "bang" }, "c-1")).Items.Select(b => b.Id));

            Assert.NotNull(await repository.FindListedAsync("b-1", "c-1"));
            Assert.Null(await repository.FindListedAsync("b-5", "c-1")); // deleted
            Assert.Null(await repository.FindListedAsync("b-6", "c-1")); // another company's branch
            Assert.Null(await repository.FindListedAsync("c-1", "c-1")); // a company, not a branch
        }
        finally
        {
            await db.Database.ExecuteSqlRawAsync("DROP TABLE COMPANYM");
        }
    }
}
