namespace iErp.Entities;

/// <summary>
/// A row of the existing, externally owned <c>USERD</c> table: one branch allotted to a user. It is read-only here;
/// this system never writes or migrates it. Only the two key columns are mapped (never the ICEGATE credentials).
/// </summary>
public class UserBranch
{
    /// <summary>The <see cref="User.Id"/> (<c>USER_ID</c>).</summary>
    public string UserId { get; set; } = "";
    /// <summary>The <see cref="Company.Id"/> of a branch, type "B" (<c>USER_BRANCH_ID</c>).</summary>
    public string BranchId { get; set; } = "";
}
