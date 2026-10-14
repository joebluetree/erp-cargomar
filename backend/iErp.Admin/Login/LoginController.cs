using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using iErp.Shared;

namespace iErp.Admin.Login;

[ApiController]
[Route("api/admin/login")]
[AllowAnonymous]
public class LoginController(ILoginService service) : ControllerBase
{
    /// <summary>Checks the credentials and returns the access token and the session details.</summary>
    [HttpPost]
    [ProducesResponseType<LoginResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        var result = await service.LoginAsync(request, ct);
        return result.Outcome switch
        {
            LoginOutcome.Success => Ok(result.Response),
            LoginOutcome.NoBranch => Problem(StatusCodes.Status403Forbidden, LoginResult.NoBranchMessage),
            LoginOutcome.NoYear => Problem(StatusCodes.Status403Forbidden, LoginResult.NoYearMessage),
            _ => Problem(StatusCodes.Status401Unauthorized, LoginResult.InvalidCredentialsMessage),
        };
    }

    private ObjectResult Problem(int status, string title) =>
        new(ApiProblem.Create(HttpContext, status, title)) { StatusCode = status };
}
