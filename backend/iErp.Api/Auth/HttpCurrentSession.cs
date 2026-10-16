using iErp.Shared.Auth;

namespace iErp.Api.Auth;

/// <summary>Reads the current request's session from the claims of its validated access token.</summary>
public class HttpCurrentSession(IHttpContextAccessor accessor) : ICurrentSession
{
    private string? Claim(string type) => accessor.HttpContext?.User.FindFirst(type)?.Value;

    public bool IsAuthenticated => accessor.HttpContext?.User.Identity?.IsAuthenticated == true;
    public string? UserId => Claim(SessionClaims.UserId);
    public string? UserCode => Claim(SessionClaims.UserCode);
    public string? EmployeeId => Claim(SessionClaims.EmployeeId);
    public string? CompanyId => Claim(SessionClaims.CompanyId);
    public string? CompanyCode => Claim(SessionClaims.CompanyCode);
    public string? BranchId => Claim(SessionClaims.BranchId);
    public string? YearId => Claim(SessionClaims.YearId);
}
