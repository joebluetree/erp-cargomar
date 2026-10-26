using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using iErp.Admin.UserRights;
using iErp.Data;
using iErp.Entities;

namespace iErp.Tests.Integration;

/// <summary>
/// Needs IERP_TEST_ORACLE. MENUM, MODULEM and USERRIGHTS are existing, externally owned tables. If the test schema has
/// all three, the test only reads them; if it has none, it creates shaped tables, checks the visible menus and the
/// view-right check, and drops them again. A schema with only some of them is left untouched. Never point
/// IERP_TEST_ORACLE at the dev database.
/// </summary>
public class MenuTablesTests
{
    private const string TableCountSql =
        "SELECT COUNT(*) AS \"Value\" FROM USER_TABLES WHERE TABLE_NAME IN ('MENUM', 'MODULEM', 'USERRIGHTS')";

    [OracleFact]
    public async Task Visible_menus_and_the_view_right_work_through_the_mappings()
    {
        using var factory = new ApiFactory();
        using var services = factory.Services.CreateScope();
        var db = services.ServiceProvider.GetRequiredService<AppDbContext>();
        var repository = new MenuRepository(db);

        var existing = (await db.Database.SqlQueryRaw<decimal>(TableCountSql).ToListAsync()).Single();
        if (existing == 3)
        {
            // Real tables: read only. Every visible menu is a new-software menu with the view right for that user and branch.
            var right = await db.Set<UserRight>().AsNoTracking()
                .Where(r => r.View == "Y" && r.UserId != null && r.BranchId != null).OrderBy(r => r.Id).FirstOrDefaultAsync();
            if (right is null)
                return;
            var menu = await db.Set<Menu>().AsNoTracking().FirstAsync(m => m.Id == right.MenuId);
            var visible = await repository.ListVisibleMenusAsync(menu.CompanyCode!, right.UserId!, right.BranchId!);
            Assert.All(visible, m => Assert.Equal("Y", m.NewSoftware));
            return;
        }

        if (existing != 0)
            return; // Some tables exist: never create or drop next to a real table.

        await db.Database.ExecuteSqlRawAsync(@"CREATE TABLE MODULEM (
            MODULE_PKID NVARCHAR2(80) NOT NULL PRIMARY KEY, REC_COMPANY_CODE NVARCHAR2(30), MODULE_NAME NVARCHAR2(120), MODULE_ORDER NUMBER)");
        await db.Database.ExecuteSqlRawAsync(@"CREATE TABLE MENUM (
            MENU_PKID NVARCHAR2(80) NOT NULL PRIMARY KEY, REC_COMPANY_CODE NVARCHAR2(20), MENU_MODULE_ID NVARCHAR2(80),
            MENU_CODE NVARCHAR2(80), MENU_NAME NVARCHAR2(120), MENU_ROUTE1 NVARCHAR2(200), MENU_ORDER NUMBER, MENU_NEWSOFTWARE CHAR(1))");
        await db.Database.ExecuteSqlRawAsync(@"CREATE TABLE USERRIGHTS (
            RIGHTS_PKID NVARCHAR2(80) NOT NULL PRIMARY KEY, RIGHTS_BRANCH_ID NVARCHAR2(80), RIGHTS_USER_ID NVARCHAR2(80),
            RIGHTS_MENU_ID NVARCHAR2(80), RIGHTS_VIEW CHAR(1), RIGHTS_ADD CHAR(1), RIGHTS_EDIT CHAR(1), RIGHTS_DELETE CHAR(1),
            RIGHTS_PRINT CHAR(1), RIGHTS_EMAIL CHAR(1), RIGHTS_DOCS CHAR(1), RIGHTS_DOCS_UPLOAD CHAR(1), RIGHTS_ADMIN CHAR(1))");
        try
        {
            string[] rows =
            [
                "INSERT INTO MODULEM VALUES ('hr', 'CPL', 'Hr', 50)",
                "INSERT INTO MENUM VALUES ('m1', 'CPL', 'hr', 'NS-COMPLIST', 'Company List', 'reports/companies', 200, 'Y')",
                "INSERT INTO MENUM VALUES ('m2', 'CPL', 'hr', 'NS-EMPLIST', 'Employee List', 'admin/employees', 203, 'Y')",
                "INSERT INTO MENUM VALUES ('m3', 'CPL', 'hr', 'OLD', 'Old screen', 'old', 1, 'N')",
                "INSERT INTO MENUM VALUES ('m4', 'SGT', 'hr', 'NS-COMPLIST', 'Other company', 'reports/companies', 200, 'Y')",
                "INSERT INTO USERRIGHTS (RIGHTS_PKID, RIGHTS_BRANCH_ID, RIGHTS_USER_ID, RIGHTS_MENU_ID, RIGHTS_VIEW) VALUES ('r1', 'b-1', 'u-1', 'm1', 'Y')",
                "INSERT INTO USERRIGHTS (RIGHTS_PKID, RIGHTS_BRANCH_ID, RIGHTS_USER_ID, RIGHTS_MENU_ID, RIGHTS_VIEW) VALUES ('r2', 'b-1', 'u-1', 'm2', 'N')",
                "INSERT INTO USERRIGHTS (RIGHTS_PKID, RIGHTS_BRANCH_ID, RIGHTS_USER_ID, RIGHTS_MENU_ID, RIGHTS_VIEW) VALUES ('r3', 'b-1', 'u-1', 'm3', 'Y')",
                "INSERT INTO USERRIGHTS (RIGHTS_PKID, RIGHTS_BRANCH_ID, RIGHTS_USER_ID, RIGHTS_MENU_ID, RIGHTS_VIEW) VALUES ('r4', 'b-2', 'u-1', 'm2', 'Y')",
                "INSERT INTO USERRIGHTS (RIGHTS_PKID, RIGHTS_BRANCH_ID, RIGHTS_USER_ID, RIGHTS_MENU_ID, RIGHTS_VIEW) VALUES ('r5', 'b-1', 'u-1', 'm4', 'Y')",
            ];
            foreach (var sql in rows)
                await db.Database.ExecuteSqlRawAsync(sql);

            // Only the company's new-software menu with view 'Y' in this branch: not m2 (view N here), m3 (old software),
            // m4 (another company).
            Assert.Equal(["m1"], (await repository.ListVisibleMenusAsync("CPL", "u-1", "b-1")).Select(m => m.Id));
            Assert.Equal(["m2"], (await repository.ListVisibleMenusAsync("CPL", "u-1", "b-2")).Select(m => m.Id));
            Assert.Equal(["hr"], (await repository.ListModulesAsync("CPL", ["hr"])).Select(m => m.Id));

            Assert.True(await repository.HasViewRightAsync("NS-COMPLIST", "CPL", "u-1", "b-1"));
            Assert.False(await repository.HasViewRightAsync("NS-EMPLIST", "CPL", "u-1", "b-1"));
            Assert.False(await repository.HasViewRightAsync("NS-COMPLIST", "CPL", "u-2", "b-1"));

            // Rights by code in b-1: m1 (view Y) and m2 (view N); not m3 (old software) or m4 (another company).
            var rights = await repository.ListRightsAsync(["NS-COMPLIST", "NS-EMPLIST", "OLD"], "CPL", "u-1", "b-1");
            Assert.Equal([("NS-COMPLIST", "Y"), ("NS-EMPLIST", "N")], rights.Select(r => (r.Code!.Trim(), r.Right.View!)).OrderBy(r => r.Item1));
        }
        finally
        {
            await db.Database.ExecuteSqlRawAsync("DROP TABLE USERRIGHTS");
            await db.Database.ExecuteSqlRawAsync("DROP TABLE MENUM");
            await db.Database.ExecuteSqlRawAsync("DROP TABLE MODULEM");
        }
    }
}
