namespace iErp.Admin.Login;

/// <summary>The body of <c>POST /api/admin/login/auto</c>.</summary>
public class AutoLoginRequest
{
    public const int MaxAppIdLength = 80;

    /// <summary>The id of the user's <c>APPDETAILS</c> row (<c>USER_APPID</c>), from the automatic-login link.</summary>
    public string? AppId { get; set; }
}
