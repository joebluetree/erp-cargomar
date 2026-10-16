using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using iErp.Admin.EmployeeProfile;
using iErp.Data;
using iErp.Entities;

namespace iErp.Tests.Integration;

/// <summary>
/// Needs IERP_TEST_ORACLE. EMPM and PARAM are existing, externally owned tables. If the test schema has both, the
/// test only reads them; if it has neither, it creates shaped tables, checks the employee-profile queries, and drops
/// them again. A schema with only one of them is left untouched.
/// </summary>
public class EmployeeProfileTablesTests
{
    private const string TableCountSql =
        "SELECT COUNT(*) AS \"Value\" FROM USER_TABLES WHERE TABLE_NAME IN ('EMPM', 'PARAM')";

    [OracleFact]
    public async Task The_employee_and_its_places_are_read_through_the_mappings()
    {
        using var factory = new ApiFactory();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var repository = new EmployeeProfileRepository(db);

        var existing = (await db.Database.SqlQueryRaw<decimal>(TableCountSql).ToListAsync()).Single();
        if (existing == 2)
        {
            // Real tables: read only. An employee with a current state is found by id, and its state and country
            // ids resolve to parameters of the right type.
            var any = await db.Set<Employee>().AsNoTracking()
                .Where(e => e.LocalStateId != null && e.LocalCountryId != null).OrderBy(e => e.Id).FirstAsync();
            var employee = await repository.FindEmployeeAsync(any.Id);
            Assert.Equal(any.Id, employee!.Id);

            var places = await repository.ListPlacesAsync([employee.LocalStateId!, employee.LocalCountryId!]);
            Assert.All(places, p => Assert.Contains(p.Type, new[] { "STATE", "COUNTRY" }));
            Assert.Null(await repository.FindEmployeeAsync("no-such-employee"));
            return;
        }

        if (existing != 0)
            return; // One table exists: never create or drop next to a real table.

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
            EMP_PFNO NVARCHAR2(50), EMP_ESINO NVARCHAR2(50), EMP_UAN_NO NVARCHAR2(20), EMP_IMAGE_NAME NVARCHAR2(35), REC_COMPANY_CODE NVARCHAR2(15), REC_BRANCH_CODE NVARCHAR2(15), EMP_IS_RELIEVED CHAR(1))");
        await db.Database.ExecuteSqlRawAsync(@"CREATE TABLE PARAM (
            PARAM_PKID NVARCHAR2(40) NOT NULL PRIMARY KEY, PARAM_TYPE NVARCHAR2(30), PARAM_CODE NVARCHAR2(50),
            PARAM_NAME NVARCHAR2(200))");
        try
        {
            string[] rows =
            [
                "INSERT INTO EMPM (EMP_PKID, EMP_NO, EMP_NAME, EMP_DO_BIRTH, EMP_LOCAL_STATE_ID, EMP_LOCAL_COUNTRY_ID, EMP_HOME_STATE_ID, EMP_PAN) VALUES ('e-1', 'EMP01', 'Asha Nair', DATE '1990-03-05', 's-kl', 'c-in', 'x-1', 'ABCDE1234F')",
                "INSERT INTO PARAM (PARAM_PKID, PARAM_TYPE, PARAM_NAME) VALUES ('s-kl', 'STATE', 'KERALA')",
                "INSERT INTO PARAM (PARAM_PKID, PARAM_TYPE, PARAM_NAME) VALUES ('c-in', 'COUNTRY', 'INDIA')",
                "INSERT INTO PARAM (PARAM_PKID, PARAM_TYPE, PARAM_NAME) VALUES ('x-1', 'DESIGNATION', 'Manager')",
                "INSERT INTO PARAM (PARAM_PKID, PARAM_TYPE, PARAM_NAME) VALUES ('s-tn', 'STATE', 'TAMIL NADU')",
            ];
            foreach (var sql in rows)
                await db.Database.ExecuteSqlRawAsync(sql);

            var employee = await repository.FindEmployeeAsync("e-1");
            Assert.Equal(("EMP01", "Asha Nair", "ABCDE1234F"), (employee!.Code, employee.Name, employee.Pan));
            Assert.Equal(new DateTime(1990, 3, 5), employee.DateOfBirth);
            Assert.Null(await repository.FindEmployeeAsync("e-2"));

            // Only the asked-for states and countries; never a parameter of another type (x-1) or one not asked for (s-tn).
            var places = await repository.ListPlacesAsync(["s-kl", "c-in", "x-1"]);
            Assert.Equal(["INDIA", "KERALA"], places.Select(p => p.Name).Order());
        }
        finally
        {
            await db.Database.ExecuteSqlRawAsync("DROP TABLE EMPM");
            await db.Database.ExecuteSqlRawAsync("DROP TABLE PARAM");
        }
    }
}
