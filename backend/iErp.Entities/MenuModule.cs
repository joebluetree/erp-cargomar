namespace iErp.Entities;

/// <summary>
/// A row of the existing, externally owned <c>MODULEM</c> table: one module (menu group) of one company. It is
/// read-only here; this system never writes or migrates it.
/// </summary>
public class MenuModule
{
    /// <summary>Opaque string key (<c>MODULE_PKID</c>), not a GUID.</summary>
    public string Id { get; set; } = "";
    public string? CompanyCode { get; set; }
    public string? Name { get; set; }
    /// <summary>The module's place in the menu (<c>MODULE_ORDER</c>).</summary>
    public decimal? Order { get; set; }
}
