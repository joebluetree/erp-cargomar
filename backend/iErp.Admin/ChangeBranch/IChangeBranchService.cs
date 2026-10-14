namespace iErp.Admin.ChangeBranch;

public interface IChangeBranchService
{
    /// <summary>The branches and years the logged-in user may switch to, or null when the session is no longer valid.</summary>
    Task<SessionOptions?> GetOptionsAsync(CancellationToken ct = default);

    /// <summary>Switches the session to the requested branch and year; the new token keeps <paramref name="expiresAt"/>.</summary>
    Task<ChangeBranchResult> ChangeAsync(ChangeBranchRequest request, DateTimeOffset expiresAt, CancellationToken ct = default);
}
