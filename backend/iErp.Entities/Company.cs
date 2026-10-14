namespace iErp.Entities;

/// <summary>
/// A row of the existing, externally owned <c>COMPANYM</c> table. The table holds both companies
/// (<see cref="Type"/> "C") and their branches ("B"). It is read-only here; this system never writes or migrates it.
/// </summary>
public class Company
{
    /// <summary>Opaque string key (<c>COMP_PKID</c>), not a GUID.</summary>
    public string Id { get; set; } = "";
    public string? Type { get; set; }
    /// <summary>For a branch, the <see cref="Id"/> of its company (<c>COMP_PARENT_ID</c>).</summary>
    public string? ParentId { get; set; }
    public string? Code { get; set; }
    public string? Name { get; set; }
    public string? Address1 { get; set; }
    public string? Address2 { get; set; }
    public string? Address3 { get; set; }
    public string? Tel { get; set; }
    public string? Email { get; set; }
    public string? Web { get; set; }
    public DateTime? DeletedDate { get; set; }
}
