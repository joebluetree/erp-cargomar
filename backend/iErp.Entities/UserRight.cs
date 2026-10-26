namespace iErp.Entities;

/// <summary>
/// A row of the existing, externally owned <c>USERRIGHTS</c> table: one user's rights on one menu in one branch. Each
/// right is "Y" or "N". It is read-only here; this system never writes or migrates it.
/// </summary>
public class UserRight
{
    /// <summary>Opaque string key (<c>RIGHTS_PKID</c>), not a GUID.</summary>
    public string Id { get; set; } = "";
    /// <summary>The branch (<c>COMPANYM</c> id) the rights apply in.</summary>
    public string? BranchId { get; set; }
    /// <summary>The user (<c>USERM.USER_PKID</c>).</summary>
    public string? UserId { get; set; }
    /// <summary>The <see cref="Menu"/>.</summary>
    public string? MenuId { get; set; }
    public string? View { get; set; }
    public string? Add { get; set; }
    public string? Edit { get; set; }
    public string? Delete { get; set; }
    public string? Print { get; set; }
    public string? Email { get; set; }
    public string? Docs { get; set; }
    public string? DocsUpload { get; set; }
    public string? Admin { get; set; }
}
