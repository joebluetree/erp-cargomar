namespace iErp.Entities;

/// <summary>
/// A row of the existing, externally owned <c>PARAM</c> table: one shared lookup value (a state, a country, ...).
/// It is read-only here; this system never writes or migrates it.
/// </summary>
public class Parameter
{
    /// <summary>Opaque string key (<c>PARAM_PKID</c>), not a GUID.</summary>
    public string Id { get; set; } = "";
    /// <summary>The kind of value (<c>PARAM_TYPE</c>), for example "STATE" or "COUNTRY".</summary>
    public string? Type { get; set; }
    public string? Name { get; set; }
}
