namespace iErp.Entities;

/// <summary>
/// A row of the existing, externally owned <c>YEARM</c> table: one financial year of one company. It is read-only
/// here; this system never writes or migrates it.
/// </summary>
public class FinancialYear
{
    /// <summary>Opaque string key (<c>YEAR_PKID</c>), not a GUID.</summary>
    public string Id { get; set; } = "";
    public decimal? Code { get; set; }
    public string? Name { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    /// <summary>"N" while the year is open, "Y" once it is closed (<c>YEAR_CLOSED</c>).</summary>
    public string? Closed { get; set; }
    /// <summary>The <see cref="Company.Code"/> of the year's company (<c>REC_COMPANY_CODE</c>).</summary>
    public string? CompanyCode { get; set; }
}
