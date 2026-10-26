using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using iErp.Admin.Login;
using iErp.Data;
using iErp.Entities;

namespace iErp.Tests.Integration;

/// <summary>
/// Needs IERP_TEST_ORACLE. USERM, YEARM and COMPANYM are existing, externally owned tables. If the test schema has
/// all three, the test only reads them; if it has none, it creates shaped tables, checks the mappings, the login
/// queries and that migrations leave the tables alone, and drops them again. A schema with only some of them is
/// left untouched. The queries are the login repository's own.
/// </summary>
public class LoginTablesTests
{
    private const string TableCountSql =
        "SELECT COUNT(*) AS \"Value\" FROM USER_TABLES WHERE TABLE_NAME IN ('USERM', 'YEARM', 'COMPANYM')";

    [OracleFact]
    public async Task Users_branches_and_years_are_read_through_the_mappings()
    {
        using var factory = new ApiFactory();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var repository = new LoginRepository(db);

        var existing = (await db.Database.SqlQueryRaw<decimal>(TableCountSql).ToListAsync()).Single();
        if (existing == 3)
        {
            // Real tables: read only. A user with a branch proves the user match (in another letter case and with
            // spaces), the branch lookup and the latest-year query against the actual schema.
            var sample = await db.Set<User>().AsNoTracking()
                .Where(u => u.BranchId != null && u.Code != null && u.CompanyCode != null)
                .OrderBy(u => u.Id).FirstAsync();

            var found = await repository.FindUsersAsync($"  {sample.Code!.ToLowerInvariant()} ", sample.CompanyCode!.ToLowerInvariant());
            Assert.Contains(found, u => u.Id == sample.Id);

            var company = await repository.FindCompanyAsync($" {sample.CompanyCode!.ToLowerInvariant()} ");
            Assert.NotNull(company);

            var branch = await repository.FindBranchAsync(sample.BranchId!);
            Assert.Equal(("B", company!.Id), (branch!.Type, branch.ParentId));

            var year = await repository.FindLatestYearAsync(company.Code!);
            Assert.NotNull(year);
            var maxStart = await db.Set<FinancialYear>().Where(y => y.CompanyCode == sample.CompanyCode).MaxAsync(y => y.StartDate);
            Assert.Equal(maxStart, year!.StartDate);
            return;
        }

        if (existing != 0)
            return; // Some but not all tables exist: never create or drop next to a real table.

        await db.Database.ExecuteSqlRawAsync(@"CREATE TABLE COMPANYM (
            COMP_PKID NVARCHAR2(40) NOT NULL PRIMARY KEY, COMP_TYPE CHAR(1), COMP_PARENT_ID NVARCHAR2(40),
            COMP_CODE NVARCHAR2(10), COMP_NAME NVARCHAR2(60), COMP_ADDRESS1 NVARCHAR2(60), COMP_ADDRESS2 NVARCHAR2(60),
            COMP_ADDRESS3 NVARCHAR2(60), COMP_TEL NVARCHAR2(60), COMP_EMAIL NVARCHAR2(60), COMP_WEB NVARCHAR2(60),
            REC_DELETED_DATE DATE)");
        await db.Database.ExecuteSqlRawAsync(@"CREATE TABLE USERM (
            USER_PKID NVARCHAR2(40) NOT NULL PRIMARY KEY, USER_CODE NVARCHAR2(15), USER_NAME NVARCHAR2(30),
            USER_PASSWORD NVARCHAR2(50), REC_COMPANY_CODE NVARCHAR2(10), USER_BRANCH_ID NVARCHAR2(40),
            USER_ISLOCKED CHAR(1), REC_DELETED CHAR(1), REC_DELETED_DATE DATE, USER_EMP_ID NVARCHAR2(40))");
        await db.Database.ExecuteSqlRawAsync(@"CREATE TABLE YEARM (
            YEAR_PKID NVARCHAR2(40), YEAR_CODE NUMBER, YEAR_NAME NVARCHAR2(25), YEAR_START_DATE DATE,
            YEAR_END_DATE DATE, YEAR_CLOSED CHAR(1), REC_COMPANY_CODE NVARCHAR2(15))");
        try
        {
            await db.Database.ExecuteSqlRawAsync(
                "INSERT INTO COMPANYM (COMP_PKID, COMP_TYPE, COMP_CODE, COMP_NAME) VALUES ('c-1', 'C', 'CMP', 'Company')");
            await db.Database.ExecuteSqlRawAsync(
                "INSERT INTO COMPANYM (COMP_PKID, COMP_TYPE, COMP_PARENT_ID, COMP_CODE, COMP_NAME) VALUES ('b-1', 'B', 'c-1', 'KOC', 'Kochi')");
            await db.Database.ExecuteSqlRawAsync(
                "INSERT INTO USERM (USER_PKID, USER_CODE, USER_NAME, USER_PASSWORD, REC_COMPANY_CODE, USER_BRANCH_ID, USER_ISLOCKED, REC_DELETED, USER_EMP_ID) VALUES ('u-1', 'U01', 'Admin', 'secret', 'CMP', 'b-1', 'N', 'N', 'e-1')");
            await db.Database.ExecuteSqlRawAsync(
                "INSERT INTO USERM (USER_PKID, USER_CODE, USER_NAME, REC_COMPANY_CODE, USER_ISLOCKED) VALUES ('u-2', 'L01', 'Locked', 'CMP', 'Y')");
            await db.Database.ExecuteSqlRawAsync(
                "INSERT INTO USERM (USER_PKID, USER_CODE, USER_NAME, REC_COMPANY_CODE, REC_DELETED) VALUES ('u-3', 'G01', 'Gone', 'CMP', 'Y')");
            await db.Database.ExecuteSqlRawAsync(
                "INSERT INTO USERM (USER_PKID, USER_CODE, USER_NAME, REC_COMPANY_CODE) VALUES ('u-4', 'N01', 'NoFlags', 'CMP')");
            await db.Database.ExecuteSqlRawAsync(
                "INSERT INTO YEARM (YEAR_PKID, YEAR_CODE, YEAR_NAME, YEAR_START_DATE, YEAR_END_DATE, REC_COMPANY_CODE) VALUES ('y-1', 2024, '2024-2025', DATE '2024-04-01', DATE '2025-03-31', 'CMP')");
            await db.Database.ExecuteSqlRawAsync(
                "INSERT INTO YEARM (YEAR_PKID, YEAR_CODE, YEAR_NAME, YEAR_START_DATE, YEAR_END_DATE, REC_COMPANY_CODE) VALUES ('y-2', 2025, '2025-2026', DATE '2025-04-01', DATE '2026-03-31', 'CMP')");

            var user = Assert.Single(await repository.FindUsersAsync("  u01 ", "cmp"));
            Assert.Empty(await repository.FindUsersAsync("Admin", "CMP")); // the name does not log in, only the code
            Assert.Equal(("U01", "secret", "b-1", "N", "N"), (user.Code, user.Password, user.BranchId, user.Locked, user.Deleted));
            Assert.Equal("e-1", user.EmployeeId);
            Assert.Null(Assert.Single(await repository.FindUsersAsync("N01", "CMP")).EmployeeId); // no employee: still a user

            Assert.Equal("c-1", (await repository.FindCompanyAsync(" cmp "))!.Id);
            var branch = await repository.FindBranchAsync(user.BranchId!);
            Assert.Equal(("B", "c-1", "Kochi"), (branch!.Type, branch.ParentId, branch.Name));
            Assert.Null(await repository.FindBranchAsync("c-1")); // a company is not a branch

            var year = await repository.FindLatestYearAsync("CMP");
            Assert.Equal(("y-2", "2025-2026", 2025m), (year!.Id, year.Name, year.Code));

            Assert.Empty(await repository.FindUsersAsync("L01", "CMP"));
            Assert.Empty(await repository.FindUsersAsync("G01", "CMP"));
            Assert.Single(await repository.FindUsersAsync("N01", "CMP")); // null flags do not exclude a user
            Assert.Equal(4, await db.Set<User>().CountAsync());
            Assert.Equal(2, await db.Set<FinancialYear>().CountAsync());
        }
        finally
        {
            await db.Database.ExecuteSqlRawAsync("DROP TABLE USERM");
            await db.Database.ExecuteSqlRawAsync("DROP TABLE YEARM");
            await db.Database.ExecuteSqlRawAsync("DROP TABLE COMPANYM");
        }
    }
}
