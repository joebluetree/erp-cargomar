namespace iErp.Admin.ChangeBranch;

/// <summary>The body of <c>POST /api/admin/session/change</c>: the branch and year to switch the session to.</summary>
public class ChangeBranchRequest
{
    public const int MaxIdLength = 40;

    public string? BranchId { get; set; }
    public string? YearId { get; set; }
}
