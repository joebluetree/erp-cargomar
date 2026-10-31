using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using iErp.Admin.Notification;
using iErp.Data;

namespace iErp.Tests.Integration;

/// <summary>
/// Needs IERP_TEST_ORACLE. GENINFO is an existing, externally owned table. If the test schema has it, the test only
/// reads it; if not, it creates a shaped one, checks which row is the latest and drops it again. Never point
/// IERP_TEST_ORACLE at the dev database.
/// </summary>
public class NotificationTablesTests
{
    [OracleFact]
    public async Task The_latest_notification_is_read_through_the_mapping()
    {
        using var factory = new ApiFactory();
        using var services = factory.Services.CreateScope();
        var db = services.ServiceProvider.GetRequiredService<AppDbContext>();
        var repository = new NotificationRepository(db);

        var existing = (await db.Database.SqlQueryRaw<decimal>(
            "SELECT COUNT(*) AS \"Value\" FROM USER_TABLES WHERE TABLE_NAME = 'GENINFO'").ToListAsync()).Single();
        if (existing == 1)
        {
            // Real table: read only. The latest is the first row of a plain SELECT in the same order (none when empty).
            var expected = (await db.Database.SqlQueryRaw<string>(
                    "SELECT HEADING AS \"Value\" FROM GENINFO WHERE VISIBLE IN ('Y', 'y') AND (TRIM(BANNER) IS NOT NULL OR TRIM(HEADING) IS NOT NULL) " +
                    "ORDER BY CASE WHEN REC_CREATED_DATE IS NULL THEN 1 ELSE 0 END, REC_CREATED_DATE DESC, " +
                    "CASE WHEN ID IS NULL THEN 1 ELSE 0 END, ID DESC")
                .ToListAsync()).FirstOrDefault();
            Assert.Equal(expected, (await repository.FindLatestAsync())?.Heading);
            return;
        }

        await db.Database.ExecuteSqlRawAsync(
            "CREATE TABLE GENINFO (ID NUMBER, HEADING NVARCHAR2(1000), CONTENT NVARCHAR2(2000), REC_CREATED_DATE DATE, BANNER NVARCHAR2(1000), VISIBLE CHAR(1))");
        try
        {
            // Visible rows unless a test says otherwise.
            async Task Insert(string values, string visible = "'Y'") =>
                await db.Database.ExecuteSqlRawAsync("INSERT INTO GENINFO (ID, HEADING, CONTENT, REC_CREATED_DATE, VISIBLE) VALUES (" + values + ", " + visible + ")");

            // No rows: nothing.
            Assert.Null(await repository.FindLatestAsync());

            // Newest date wins over a higher id; a row without a date comes after every dated row.
            await Insert("9, 'Older', NULL, TO_DATE('2026-10-20', 'YYYY-MM-DD')");
            await Insert("3, 'Newer', 'Text', TO_DATE('2026-10-28', 'YYYY-MM-DD')");
            await Insert("50, 'Undated', NULL, NULL");
            Assert.Equal("Newer", (await repository.FindLatestAsync())?.Heading);

            // Same date: the highest id; a row without an id comes last.
            await Insert("4, 'Four', NULL, TO_DATE('2026-10-29', 'YYYY-MM-DD')");
            await Insert("NULL, 'No id', NULL, TO_DATE('2026-10-29', 'YYYY-MM-DD')");
            await Insert("5, 'Five', NULL, TO_DATE('2026-10-29', 'YYYY-MM-DD')");
            Assert.Equal("Five", (await repository.FindLatestAsync())?.Heading);

            // A row with neither a banner nor a heading is skipped, however new.
            await Insert("99, '   ', NULL, TO_DATE('2026-10-30', 'YYYY-MM-DD')");
            await Insert("98, NULL, 'Text', TO_DATE('2026-10-30', 'YYYY-MM-DD')");
            Assert.Equal("Five", (await repository.FindLatestAsync())?.Heading);

            // A banner alone is enough, and its text comes back exactly as entered.
            await db.Database.ExecuteSqlRawAsync(
                "INSERT INTO GENINFO (ID, BANNER, REC_CREATED_DATE, VISIBLE) VALUES (97, '  Bonus' || CHR(10) || 'announced ', TO_DATE('2026-10-31', 'YYYY-MM-DD'), 'Y')");
            var latest = await repository.FindLatestAsync();
            Assert.Equal(("  Bonus\nannounced ", null), (latest?.Banner, latest?.Heading));

            // A newer row that is not visible ('N', or no value) is skipped; a lower-case 'y' is visible.
            await Insert("200, 'Hidden', NULL, TO_DATE('2026-11-05', 'YYYY-MM-DD')", "'N'");
            await Insert("201, 'No flag', NULL, TO_DATE('2026-11-06', 'YYYY-MM-DD')", "NULL");
            Assert.Null((await repository.FindLatestAsync())?.Heading);
            await Insert("202, 'Lower case', NULL, TO_DATE('2026-11-04', 'YYYY-MM-DD')", "'y'");
            Assert.Equal("Lower case", (await repository.FindLatestAsync())?.Heading);

            // Every row 'N': no notification.
            await db.Database.ExecuteSqlRawAsync("UPDATE GENINFO SET VISIBLE = 'N'");
            Assert.Null(await repository.FindLatestAsync());
        }
        finally
        {
            await db.Database.ExecuteSqlRawAsync("DROP TABLE GENINFO");
        }
    }
}
