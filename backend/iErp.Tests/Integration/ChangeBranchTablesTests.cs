using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using iErp.Admin.ChangeBranch;
using iErp.Data;
using iErp.Entities;

namespace iErp.Tests.Integration;

/// <summary>
/// Needs IERP_TEST_ORACLE. USERD, USERM, YEARM and COMPANYM are existing, externally owned tables. If the test schema
/// has all four, the test only reads them; if it has none, it creates shaped tables, checks the USERD mapping and the
/// change-branch queries, and drops them again. A schema with only some of them is left untouched.
/// </summary>
public class ChangeBranchTablesTests
{
    private const string TableCountSql =
        "SELECT COUNT(*) AS \"Value\" FROM USER_TABLES WHERE TABLE_NAME IN ('USERD', 'USERM', 'YEARM', 'COMPANYM')";

    [OracleFact]
    public async Task Allowed_branches_and_years_are_read_through_the_mappings()
    {
        using var factory = new ApiFactory();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var repository = new ChangeBranchRepository(db);

        var existing = (await db.Database.SqlQueryRaw<decimal>(TableCountSql).ToListAsync()).Single();
        if (existing == 4)
        {
            // Real tables: read only. A user's allowed branches are exactly their USERD rows that are branches of
            // their company, and every year of the company is listed newest first.
            var user = await db.Set<User>().AsNoTracking()
                .Where(u => u.BranchId != null && u.CompanyCode != null).OrderBy(u => u.Id).FirstAsync();
            var company = await db.Set<Company>().AsNoTracking()
                .FirstAsync(c => c.Type == "C" && c.Code == user.CompanyCode);

            var branches = await repository.ListBranchesAsync(user.Id, company.Id);
            var allotted = await db.Set<UserBranch>().AsNoTracking()
                .Where(d => d.UserId == user.Id).Select(d => d.BranchId).ToListAsync();
            Assert.NotEmpty(branches);
            Assert.All(branches, b => Assert.Contains(b.Id, allotted));
            Assert.All(branches, b => Assert.Equal(("B", company.Id), (b.Type, b.ParentId)));
            Assert.NotNull(await repository.FindBranchAsync(user.Id, company.Id, branches[0].Id));

            var years = await repository.ListYearsAsync(company.Code!);
            Assert.Equal(await db.Set<FinancialYear>().CountAsync(y => y.CompanyCode == company.Code && y.Closed == "N"), years.Count);
            Assert.All(years, y => Assert.Equal("N", y.Closed));
            var starts = years.Where(y => y.StartDate != null).Select(y => y.StartDate).ToList();
            Assert.Equal(starts.OrderDescending(), starts);
            return;
        }

        if (existing != 0)
            return; // Some but not all tables exist: never create or drop next to a real table.

        await db.Database.ExecuteSqlRawAsync(@"CREATE TABLE COMPANYM (
            COMP_PKID NVARCHAR2(40) NOT NULL PRIMARY KEY, COMP_TYPE CHAR(1), COMP_PARENT_ID NVARCHAR2(40),
            COMP_CODE NVARCHAR2(10), COMP_NAME NVARCHAR2(60), COMP_ADDRESS1 NVARCHAR2(60), COMP_ADDRESS2 NVARCHAR2(60),
            COMP_ADDRESS3 NVARCHAR2(60), COMP_TEL NVARCHAR2(40), COMP_EMAIL NVARCHAR2(60), COMP_WEB NVARCHAR2(60),
            REC_DELETED_DATE DATE)");
        await db.Database.ExecuteSqlRawAsync(@"CREATE TABLE USERM (
            USER_PKID NVARCHAR2(40) NOT NULL PRIMARY KEY, USER_CODE NVARCHAR2(15), USER_NAME NVARCHAR2(30),
            USER_PASSWORD NVARCHAR2(50), REC_COMPANY_CODE NVARCHAR2(10), USER_BRANCH_ID NVARCHAR2(40),
            USER_ISLOCKED CHAR(1), REC_DELETED CHAR(1), REC_DELETED_DATE DATE)");
        await db.Database.ExecuteSqlRawAsync(@"CREATE TABLE USERD (
            USER_ID NVARCHAR2(40), USER_BRANCH_ID NVARCHAR2(40), USER_RIGHTS_TOTAL NUMBER, USER_ICEGATE_PWD NVARCHAR2(100))");
        await db.Database.ExecuteSqlRawAsync(@"CREATE TABLE YEARM (
            YEAR_PKID NVARCHAR2(40), YEAR_CODE NUMBER, YEAR_NAME NVARCHAR2(25), YEAR_START_DATE DATE,
            YEAR_END_DATE DATE, YEAR_CLOSED CHAR(1), REC_COMPANY_CODE NVARCHAR2(15))");
        try
        {
            string[] rows =
            [
                "INSERT INTO COMPANYM (COMP_PKID, COMP_TYPE, COMP_CODE, COMP_NAME) VALUES ('c-1', 'C', 'CMP', 'Company')",
                "INSERT INTO COMPANYM (COMP_PKID, COMP_TYPE, COMP_CODE, COMP_NAME) VALUES ('c-2', 'C', 'OTH', 'Other')",
                "INSERT INTO COMPANYM (COMP_PKID, COMP_TYPE, COMP_PARENT_ID, COMP_NAME) VALUES ('b-1', 'B', 'c-1', 'Mumbai')",
                "INSERT INTO COMPANYM (COMP_PKID, COMP_TYPE, COMP_PARENT_ID, COMP_NAME) VALUES ('b-2', 'B', 'c-1', 'Kochi')",
                "INSERT INTO COMPANYM (COMP_PKID, COMP_TYPE, COMP_PARENT_ID, COMP_NAME) VALUES ('b-3', 'B', 'c-2', 'Other branch')",
                "INSERT INTO COMPANYM (COMP_PKID, COMP_TYPE, COMP_PARENT_ID, COMP_NAME, REC_DELETED_DATE) VALUES ('b-4', 'B', 'c-1', 'Closed', DATE '2025-01-01')",
                "INSERT INTO COMPANYM (COMP_PKID, COMP_TYPE, COMP_PARENT_ID, COMP_NAME) VALUES ('b-5', 'B', 'c-1', 'Not allotted')",
                "INSERT INTO USERM (USER_PKID, USER_CODE, USER_NAME, REC_COMPANY_CODE, USER_BRANCH_ID, USER_ISLOCKED) VALUES ('u-1', 'U01', 'Admin', 'CMP', 'b-1', 'N')",
                "INSERT INTO USERM (USER_PKID, USER_CODE, REC_COMPANY_CODE, USER_ISLOCKED) VALUES ('u-2', 'L01', 'CMP', 'Y')",
                "INSERT INTO USERD (USER_ID, USER_BRANCH_ID, USER_ICEGATE_PWD) VALUES ('u-1', 'b-1', 'secret')",
                "INSERT INTO USERD (USER_ID, USER_BRANCH_ID) VALUES ('u-1', 'b-2')",
                "INSERT INTO USERD (USER_ID, USER_BRANCH_ID) VALUES ('u-1', 'b-3')",
                "INSERT INTO USERD (USER_ID, USER_BRANCH_ID) VALUES ('u-1', 'b-4')",
                "INSERT INTO YEARM (YEAR_PKID, YEAR_CODE, YEAR_NAME, YEAR_START_DATE, YEAR_CLOSED, REC_COMPANY_CODE) VALUES ('y-1', 2024, '2024-2025', DATE '2024-04-01', 'Y', 'CMP')",
                "INSERT INTO YEARM (YEAR_PKID, YEAR_CODE, YEAR_NAME, YEAR_START_DATE, YEAR_CLOSED, REC_COMPANY_CODE) VALUES ('y-2', 2025, '2025-2026', DATE '2025-04-01', 'N', 'CMP')",
                "INSERT INTO YEARM (YEAR_PKID, YEAR_CODE, YEAR_NAME, YEAR_START_DATE, YEAR_CLOSED, REC_COMPANY_CODE) VALUES ('y-3', 2026, '2026-2027', DATE '2026-04-01', 'N', 'CMP')",
                "INSERT INTO YEARM (YEAR_PKID, YEAR_CODE, YEAR_NAME, YEAR_START_DATE, YEAR_CLOSED, REC_COMPANY_CODE) VALUES ('y-9', 2025, '2025-2026', DATE '2025-04-01', 'N', 'OTH')",
            ];
            foreach (var sql in rows)
                await db.Database.ExecuteSqlRawAsync(sql);

            // Allotted, of the company, not deleted; by name. Not the other company's, the deleted or the unallotted one.
            Assert.Equal(["Kochi", "Mumbai"], (await repository.ListBranchesAsync("u-1", "c-1")).Select(b => b.Name));
            Assert.NotNull(await repository.FindBranchAsync("u-1", "c-1", "b-2"));
            Assert.Null(await repository.FindBranchAsync("u-1", "c-1", "b-3"));
            Assert.Null(await repository.FindBranchAsync("u-1", "c-1", "b-4"));
            Assert.Null(await repository.FindBranchAsync("u-1", "c-1", "b-5"));

            // The company's open years, newest first; never the closed one (y-1) or another company's.
            Assert.Equal(["y-3", "y-2"], (await repository.ListYearsAsync("CMP")).Select(y => y.Id));
            Assert.NotNull(await repository.FindYearAsync("CMP", "y-2"));
            Assert.Null(await repository.FindYearAsync("CMP", "y-1"));
            Assert.Null(await repository.FindYearAsync("CMP", "y-9"));

            Assert.NotNull(await repository.FindActiveUserAsync("u-1"));
            Assert.Null(await repository.FindActiveUserAsync("u-2"));
            Assert.Equal("Company", (await repository.FindCompanyAsync("c-1"))!.Name);
            Assert.Null(await repository.FindCompanyAsync("b-1"));
        }
        finally
        {
            await db.Database.ExecuteSqlRawAsync("DROP TABLE USERD");
            await db.Database.ExecuteSqlRawAsync("DROP TABLE USERM");
            await db.Database.ExecuteSqlRawAsync("DROP TABLE YEARM");
            await db.Database.ExecuteSqlRawAsync("DROP TABLE COMPANYM");
        }
    }
}
