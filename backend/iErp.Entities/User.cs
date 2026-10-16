namespace iErp.Entities;

/// <summary>
/// A row of the existing, externally owned <c>USERM</c> table: an ERP user of one company. It is read-only here;
/// this system never writes or migrates it.
/// </summary>
public class User
{
    /// <summary>Opaque string key (<c>USER_PKID</c>), not a GUID.</summary>
    public string Id { get; set; } = "";
    public string? Code { get; set; }
    public string? Name { get; set; }
    /// <summary>The stored password (<c>USER_PASSWORD</c>), as the legacy system wrote it.</summary>
    public string? Password { get; set; }
    /// <summary>The <see cref="Company.Code"/> of the user's company (<c>REC_COMPANY_CODE</c>).</summary>
    public string? CompanyCode { get; set; }
    /// <summary>The <see cref="Company.Id"/> of the user's default branch (<c>USER_BRANCH_ID</c>).</summary>
    public string? BranchId { get; set; }
    /// <summary>The user's employee (<c>USER_EMP_ID</c>, an <c>EMPM.EMP_PKID</c>); empty for users without one.</summary>
    public string? EmployeeId { get; set; }
    /// <summary>"Y" when the user is locked (<c>USER_ISLOCKED</c>).</summary>
    public string? Locked { get; set; }
    /// <summary>"Y" when the row is marked deleted (<c>REC_DELETED</c>).</summary>
    public string? Deleted { get; set; }
    public DateTime? DeletedDate { get; set; }
}
