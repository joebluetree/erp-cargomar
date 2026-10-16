using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using iErp.Admin.EmployeeList;
using iErp.Admin.EmployeeProfile;
using iErp.Data;
using iErp.Entities;

namespace iErp.Tests.Integration;

/// <summary>
/// Needs IERP_TEST_ORACLE. EMPM and COMPANYM are existing, externally owned tables. If the test schema has both, the
/// test only reads them; if it has neither, it creates shaped tables, checks the Employee List queries (scope, filters,
/// order and paging) and drops them again. A schema with only one of them is left untouched. Never point
/// IERP_TEST_ORACLE at the dev database.
/// </summary>
public class EmployeeListTablesTests
{
    private const string TableCountSql =
        "SELECT COUNT(*) AS \"Value\" FROM USER_TABLES WHERE TABLE_NAME IN ('EMPM', 'COMPANYM')";

    [OracleFact]
    public async Task The_scope_filters_order_and_paging_work_through_the_mappings()
    {
        using var factory = new ApiFactory();
        using var services = factory.Services.CreateScope();
        var db = services.ServiceProvider.GetRequiredService<AppDbContext>();
        var list = new EmployeeListRepository(db);
        var profiles = new EmployeeProfileRepository(db);

        var existing = (await db.Database.SqlQueryRaw<decimal>(TableCountSql).ToListAsync()).Single();
        if (existing == 2)
        {
            // Real tables: read only. Every listed employee of a branch is in that branch's scope and not relieved.
            var any = await db.Set<Employee>().AsNoTracking()
                .Where(e => e.Relieved == "N" && e.CompanyCode != null && e.BranchCode != null).OrderBy(e => e.Id).FirstAsync();
            var scope = new EmployeeScope(any.CompanyCode!, any.BranchCode!);
            var (items, total) = await list.ListAsync(new EmployeeListQuery { PageSize = 100 }, scope);
            Assert.True(total >= 1);
            Assert.All(items, e => Assert.Equal((scope.CompanyCode, scope.BranchCode, "N"), (e.CompanyCode, e.BranchCode, e.Relieved)));
            Assert.NotNull(await profiles.FindInScopeAsync(any.Id, scope));
            return;
        }

        if (existing != 0)
            return; // One table exists: never create or drop next to a real table.

        await db.Database.ExecuteSqlRawAsync(@"CREATE TABLE COMPANYM (
            COMP_PKID NVARCHAR2(40) NOT NULL PRIMARY KEY, COMP_TYPE CHAR(1), COMP_PARENT_ID NVARCHAR2(40),
            COMP_CODE NVARCHAR2(10), COMP_NAME NVARCHAR2(60), COMP_ADDRESS1 NVARCHAR2(60), COMP_ADDRESS2 NVARCHAR2(60),
            COMP_ADDRESS3 NVARCHAR2(60), COMP_TEL NVARCHAR2(40), COMP_EMAIL NVARCHAR2(60), COMP_WEB NVARCHAR2(60),
            REC_DELETED_DATE DATE)");
        await db.Database.ExecuteSqlRawAsync(@"CREATE TABLE EMPM (
            EMP_PKID NVARCHAR2(40) NOT NULL PRIMARY KEY, EMP_NO NVARCHAR2(30), EMP_NAME NVARCHAR2(100),
            EMP_FATHER_NAME NVARCHAR2(60), EMP_SPOUSE_NAME NVARCHAR2(60), EMP_MARITAL_STATUS NVARCHAR2(10), EMP_DO_BIRTH DATE,
            EMP_BANK_ACNO NVARCHAR2(50), EMP_BANK_NAME NVARCHAR2(60), EMP_BANK_BRANCH NVARCHAR2(60), EMP_IFSC_CODE NVARCHAR2(20),
            EMP_LOCAL_ADDRESS1 NVARCHAR2(60), EMP_LOCAL_ADDRESS2 NVARCHAR2(60), EMP_LOCAL_ADDRESS3 NVARCHAR2(60),
            EMP_LOCAL_CITY NVARCHAR2(60), EMP_LOCAL_STATE_ID NVARCHAR2(40), EMP_LOCAL_PIN NVARCHAR2(15),
            EMP_LOCAL_POBOX NVARCHAR2(15), EMP_LOCAL_COUNTRY_ID NVARCHAR2(40),
            EMP_HOME_ADDRESS1 NVARCHAR2(60), EMP_HOME_ADDRESS2 NVARCHAR2(60), EMP_HOME_ADDRESS3 NVARCHAR2(60),
            EMP_HOME_CITY NVARCHAR2(60), EMP_HOME_STATE_ID NVARCHAR2(40), EMP_HOME_PIN NVARCHAR2(15),
            EMP_HOME_POBOX NVARCHAR2(15), EMP_HOME_COUNTRY_ID NVARCHAR2(40),
            EMP_MOBILE NVARCHAR2(30), EMP_EMAIL_PERSONAL NVARCHAR2(60), EMP_ADHAR_NO NVARCHAR2(20), EMP_PAN NVARCHAR2(50),
            EMP_PFNO NVARCHAR2(50), EMP_ESINO NVARCHAR2(50), EMP_UAN_NO NVARCHAR2(20), EMP_IMAGE_NAME NVARCHAR2(35),
            REC_COMPANY_CODE NVARCHAR2(15), REC_BRANCH_CODE NVARCHAR2(15), EMP_IS_RELIEVED CHAR(1))");
        try
        {
            string[] rows =
            [
                "INSERT INTO COMPANYM (COMP_PKID, COMP_TYPE, COMP_CODE, COMP_NAME) VALUES ('c-1', 'C', 'CMP', 'Company')",
                "INSERT INTO COMPANYM (COMP_PKID, COMP_TYPE, COMP_PARENT_ID, COMP_CODE, COMP_NAME) VALUES ('b-1', 'B', 'c-1', 'KOC', 'Kochi')",
                "INSERT INTO COMPANYM (COMP_PKID, COMP_TYPE, COMP_PARENT_ID, COMP_CODE, COMP_NAME) VALUES ('b-2', 'B', 'c-1', 'CHE', 'Chennai')",
                "INSERT INTO EMPM (EMP_PKID, EMP_NO, EMP_NAME, REC_COMPANY_CODE, REC_BRANCH_CODE, EMP_IS_RELIEVED) VALUES ('e-1', '1001', 'Bala', 'CMP', 'KOC', 'N')",
                "INSERT INTO EMPM (EMP_PKID, EMP_NO, EMP_NAME, REC_COMPANY_CODE, REC_BRANCH_CODE, EMP_IS_RELIEVED) VALUES ('e-2', '1002', 'Anu', 'CMP', 'KOC', 'N')",
                "INSERT INTO EMPM (EMP_PKID, EMP_NO, EMP_NAME, REC_COMPANY_CODE, REC_BRANCH_CODE, EMP_IS_RELIEVED) VALUES ('e-3', '2001', 'Anu', 'CMP', 'KOC', 'N')",
                "INSERT INTO EMPM (EMP_PKID, EMP_NO, EMP_NAME, REC_COMPANY_CODE, REC_BRANCH_CODE, EMP_IS_RELIEVED) VALUES ('e-4', '1003', 'Relieved', 'CMP', 'KOC', 'Y')",
                "INSERT INTO EMPM (EMP_PKID, EMP_NO, EMP_NAME, REC_COMPANY_CODE, REC_BRANCH_CODE, EMP_IS_RELIEVED) VALUES ('e-5', '1004', 'Other branch', 'CMP', 'CHE', 'N')",
                "INSERT INTO EMPM (EMP_PKID, EMP_NO, EMP_NAME, REC_COMPANY_CODE, REC_BRANCH_CODE, EMP_IS_RELIEVED) VALUES ('e-6', '1005', 'Other company', 'OTH', 'KOC', 'N')",
                "INSERT INTO EMPM (EMP_PKID, EMP_NO, EMP_NAME, REC_COMPANY_CODE, REC_BRANCH_CODE, EMP_IS_RELIEVED) VALUES ('e-7', '1_06', 'C_D 100%', 'CMP', 'KOC', 'N')",
            ];
            foreach (var sql in rows)
                await db.Database.ExecuteSqlRawAsync(sql);

            Assert.Equal("KOC", await profiles.FindBranchCodeAsync("b-1"));
            Assert.Null(await profiles.FindBranchCodeAsync("c-1")); // a company, not a branch
            var scope = new EmployeeScope("CMP", "KOC");

            // In scope only (not relieved, not another branch or company), by name then id.
            var (all, total) = await list.ListAsync(new EmployeeListQuery(), scope);
            Assert.Equal(["e-2", "e-3", "e-1", "e-7"], all.Select(e => e.Id));
            Assert.Equal(4, total);

            // Paging: two pages of two, no overlap.
            var (page2, _) = await list.ListAsync(new EmployeeListQuery { Page = 2, PageSize = 2 }, scope);
            Assert.Equal(["e-1", "e-7"], page2.Select(e => e.Id));

            // Filters: case-insensitive contains; % and _ are ordinary characters.
            Assert.Equal(["e-2", "e-3"], (await list.ListAsync(new EmployeeListQuery { Name = "anu" }, scope)).Items.Select(e => e.Id));
            Assert.Equal(["e-2"], (await list.ListAsync(new EmployeeListQuery { Code = "100", Name = "an" }, scope)).Items.Select(e => e.Id));
            Assert.Equal(["e-7"], (await list.ListAsync(new EmployeeListQuery { Code = "1_0" }, scope)).Items.Select(e => e.Id));
            Assert.Equal(["e-7"], (await list.ListAsync(new EmployeeListQuery { Name = "100%" }, scope)).Items.Select(e => e.Id));

            Assert.NotNull(await profiles.FindInScopeAsync("e-1", scope));
            Assert.Null(await profiles.FindInScopeAsync("e-4", scope));
            Assert.Null(await profiles.FindInScopeAsync("e-5", scope));
            Assert.Null(await profiles.FindInScopeAsync("e-6", scope));
        }
        finally
        {
            await db.Database.ExecuteSqlRawAsync("DROP TABLE EMPM");
            await db.Database.ExecuteSqlRawAsync("DROP TABLE COMPANYM");
        }
    }
}
