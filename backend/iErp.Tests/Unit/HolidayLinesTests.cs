using iErp.SharedBusiness.Holidays;

namespace iErp.Tests.Unit;

/// <summary>The holiday file's lines: "holiday,day,date", each field exactly as written (design D2).</summary>
public class HolidayLinesTests
{
    [Fact]
    public void A_line_is_holiday_day_and_date_exactly_as_written()
    {
        // The file's day is kept even when it is wrong (1 May 2026 is a Friday), and the date is not reformatted.
        Assert.Equal([new HolidayDto("Labour Day", "Tuesday", "01-May-2026")], HolidayLines.Parse(["Labour Day,Tuesday,01-May-2026"]));
    }

    [Fact]
    public void A_holiday_name_may_hold_commas_because_the_last_two_fields_are_day_and_date()
    {
        Assert.Equal([new HolidayDto("Onam, Thiruvonam", "Wednesday", "26-08-2026")], HolidayLines.Parse(["Onam, Thiruvonam,Wednesday,26-08-2026"]));
    }

    [Fact]
    public void Two_fields_are_a_holiday_and_a_date_and_one_field_a_holiday_alone()
    {
        Assert.Equal(
            [new HolidayDto("Local festival", null, "26-10"), new HolidayDto("Diwali", null, null)],
            HolidayLines.Parse(["Local festival,26-10", "Diwali"]));
    }

    [Theory]
    [InlineData("Christmas,,25-12-2026", "Christmas", null, "25-12-2026")]
    [InlineData(",Monday,26-01-2026", null, "Monday", "26-01-2026")]
    [InlineData("Republic Day,Monday,", "Republic Day", "Monday", null)]
    [InlineData(" , , ", null, null, null)]
    public void An_empty_field_has_no_value(string line, string? holiday, string? day, string? date)
    {
        Assert.Equal([new HolidayDto(holiday, day, date)], HolidayLines.Parse([line]));
    }

    [Fact]
    public void Fields_are_trimmed_and_otherwise_kept_as_written()
    {
        Assert.Equal([new HolidayDto("Vishu  Day", "THURSDAY", "14/05/2026")], HolidayLines.Parse(["   Vishu  Day ,  THURSDAY  ,   14/05/2026   "]));
    }

    [Theory]
    [InlineData("Holiday,Day,Date")]
    [InlineData("HOLIDAY , day , DATE")]
    public void A_heading_line_is_skipped(string heading)
    {
        Assert.Equal([new HolidayDto("Vishu", "Thursday", "14-May-2026")], HolidayLines.Parse([heading, "Vishu,Thursday,14-May-2026"]));
    }

    [Fact]
    public void A_space_separated_line_is_the_holiday_alone()
    {
        Assert.Equal(
            [new HolidayDto("Republic Day    Monday    26-01-2026", null, null)],
            HolidayLines.Parse(["Republic Day    Monday    26-01-2026"]));
    }

    [Fact]
    public void Blank_lines_are_skipped_and_the_order_is_kept()
    {
        Assert.Equal(
            [new HolidayDto("B", "Tuesday", "2"), new HolidayDto("A", "Monday", "1")],
            HolidayLines.Parse(["", "B,Tuesday,2", "   ", "A,Monday,1", "\t"]));
    }

    [Fact]
    public void No_lines_give_no_holidays()
    {
        Assert.Empty(HolidayLines.Parse([]));
    }
}
