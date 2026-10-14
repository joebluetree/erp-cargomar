namespace iErp.Shared.Auth;

/// <summary>
/// Settings of the access token issued at login (configuration section <c>Jwt</c>). The signing key is a secret:
/// it comes from user secrets, the Git-ignored local settings file or the environment, never from the repository.
/// </summary>
public class JwtOptions
{
    public const string SectionName = "Jwt";

    /// <summary>The shortest signing key accepted, in bytes (HMAC-SHA256 needs at least 256 bits).</summary>
    public const int MinSigningKeyBytes = 32;

    public string Issuer { get; set; } = "iErp";
    public string Audience { get; set; } = "iErp";
    public string SigningKey { get; set; } = "";
    public int LifetimeMinutes { get; set; } = 480;
}
