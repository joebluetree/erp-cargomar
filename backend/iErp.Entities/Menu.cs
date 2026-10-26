namespace iErp.Entities;

/// <summary>
/// A row of the existing, externally owned <c>MENUM</c> table: one menu of one company. It is read-only here; this
/// system never writes or migrates it.
/// </summary>
public class Menu
{
    /// <summary>Opaque string key (<c>MENU_PKID</c>), not a GUID.</summary>
    public string Id { get; set; } = "";
    /// <summary>The <see cref="Company.Code"/> of the menu's company (<c>REC_COMPANY_CODE</c>).</summary>
    public string? CompanyCode { get; set; }
    /// <summary>The <see cref="MenuModule"/> the menu is listed under (<c>MENU_MODULE_ID</c>).</summary>
    public string? ModuleId { get; set; }
    public string? Code { get; set; }
    public string? Name { get; set; }
    /// <summary>The application route of the menu, such as <c>reports/companies</c> (<c>MENU_ROUTE1</c>).</summary>
    public string? Route { get; set; }
    /// <summary>The menu's place within its module (<c>MENU_ORDER</c>).</summary>
    public decimal? Order { get; set; }
    /// <summary>"Y" when the menu is shown in the new software (<c>MENU_NEWSOFTWARE</c>).</summary>
    public string? NewSoftware { get; set; }
}
