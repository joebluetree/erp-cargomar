using System.Text;
using iErp.Shared;
using iErp.Shared.Auth;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace iErp.Api.Auth;

/// <summary>
/// Validates access tokens with the same <see cref="JwtOptions"/> the Admin login signs them with, and answers a
/// missing, invalid or expired token with a 401 in the API's problem-details format.
/// </summary>
public class ConfigureJwtBearer(IOptions<JwtOptions> jwtOptions) : IConfigureNamedOptions<JwtBearerOptions>
{
    public void Configure(string? name, JwtBearerOptions options)
    {
        if (name != JwtBearerDefaults.AuthenticationScheme) return;

        var jwt = jwtOptions.Value;
        options.MapInboundClaims = false; // keep the token's claim names (sub, name, ierp:*)
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwt.Issuer,
            ValidateAudience = true,
            ValidAudience = jwt.Audience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1),
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SigningKey)),
            ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
            NameClaimType = SessionClaims.UserName,
        };
        options.Events = new JwtBearerEvents
        {
            OnChallenge = async context =>
            {
                context.HandleResponse();
                var problem = ApiProblem.Create(context.HttpContext, StatusCodes.Status401Unauthorized,
                    "Authentication is required.");
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await context.Response.WriteAsJsonAsync(problem, (System.Text.Json.JsonSerializerOptions?)null,
                    "application/problem+json", context.HttpContext.RequestAborted);
            },
        };
    }

    public void Configure(JwtBearerOptions options) => Configure(JwtBearerDefaults.AuthenticationScheme, options);
}
