namespace iErp.Entities;

/// <summary>
/// A row of the existing, externally owned <c>GENINFO</c> table: one announcement, a banner text for the scrolling bar,
/// a heading and a longer content for the Notification screen. It is read-only here; this system never writes or migrates it. The table has no key,
/// and every column may be null.
/// </summary>
public class Notification
{
    /// <summary><c>ID</c>: a number with no scale, so a fractional id still reads; not unique and may be null.</summary>
    public decimal? Id { get; set; }
    /// <summary><c>BANNER</c>: the text of the scrolling bar.</summary>
    public string? Banner { get; set; }
    public string? Heading { get; set; }
    public string? Content { get; set; }
    /// <summary><c>VISIBLE</c>: "Y" when the announcement may be shown; any other value, or none, hides it.</summary>
    public string? Visible { get; set; }
    /// <summary><c>REC_CREATED_DATE</c>: when the announcement was entered, with its time.</summary>
    public DateTime? CreatedDate { get; set; }
}
