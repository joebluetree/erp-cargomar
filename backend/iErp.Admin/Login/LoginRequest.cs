namespace iErp.Admin.Login;

/// <summary>The body of <c>POST /api/admin/login</c>.</summary>
public class LoginRequest
{
    public const int MaxUserCodeLength = 15;
    public const int MaxPasswordLength = 50;
    public const int MaxCompanyCodeLength = 10;

    /// <summary>The user code (<c>USERM.USER_CODE</c>), not the display name.</summary>
    public string? UserCode { get; set; }
    public string? Password { get; set; }
    public string? CompanyCode { get; set; }
}
