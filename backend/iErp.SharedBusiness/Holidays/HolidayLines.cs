namespace iErp.SharedBusiness.Holidays;

/// <summary>
/// One holiday of a branch's holiday file: its holiday, day and date, each exactly as the file writes it. Any of them
/// may be missing.
/// </summary>
public record HolidayDto(string? Holiday, string? Day, string? Date);

/// <summary>
/// Reads the lines of a branch's holiday file (admin-holiday-list design D2). Each line that is not blank is
/// <c>holiday,day,date</c> (<c>Republic Day,Monday,26-01-2026</c>):
/// <list type="bullet">
/// <item>the last field is the date and the one before it the day; the fields before them, joined again with commas,
/// are the holiday, so a holiday name may hold commas;</item>
/// <item>a line with two fields is a holiday and a date;</item>
/// <item>a line without a comma is a holiday alone.</item>
/// </list>
/// Every field is trimmed and otherwise kept exactly as written; an empty field is null. Nothing is calculated, checked
/// or reformatted. A heading line ("Holiday,Day,Date", any case) and blank lines are skipped.
/// </summary>
public static class HolidayLines
{
    public static IReadOnlyList<HolidayDto> Parse(IEnumerable<string> lines)
    {
        var holidays = new List<HolidayDto>();
        foreach (var raw in lines)
        {
            var line = raw.Trim();
            if (line.Length == 0)
                continue;

            // Cut at the last two commas, so the holiday keeps its own commas and spaces exactly ("Onam, Thiruvonam").
            var last = line.LastIndexOf(',');
            var before = last > 0 ? line.LastIndexOf(',', last - 1) : -1;
            var holiday = last < 0
                ? new HolidayDto(Clean(line), null, null)
                : before < 0
                    ? new HolidayDto(Clean(line[..last]), null, Clean(line[(last + 1)..]))
                    : new HolidayDto(Clean(line[..before]), Clean(line[(before + 1)..last]), Clean(line[(last + 1)..]));
            if (IsHeading(holiday))
                continue;
            holidays.Add(holiday);
        }
        return holidays;
    }

    private static bool IsHeading(HolidayDto line) =>
        string.Equals(line.Holiday, "Holiday", StringComparison.OrdinalIgnoreCase)
        && string.Equals(line.Day, "Day", StringComparison.OrdinalIgnoreCase)
        && string.Equals(line.Date, "Date", StringComparison.OrdinalIgnoreCase);

    private static string? Clean(string field)
    {
        var value = field.Trim();
        return value.Length == 0 ? null : value;
    }
}
