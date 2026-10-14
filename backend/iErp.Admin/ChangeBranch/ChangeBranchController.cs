using System.Globalization;
using iErp.Admin.Login;
using iErp.Shared;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace iErp.Admin.ChangeBranch;

/// <summary>
/// The logged-in session's branch and year. Both endpoints need a valid token (the default policy); the user and
/// company are always the token's own.
/// </summary>
[ApiController]
[Route("api/admin/session")]
public class ChangeBranchController(IChangeBranchService service) : ControllerBase
{
    /// <summary>The branches and financial years the logged-in user may switch to.</summary>
    [HttpGet("options")]
    [ProducesResponseType<SessionOptions>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Options(CancellationToken ct)
    {
        var options = await service.GetOptionsAsync(ct);
        return options is null
            ? Problem(StatusCodes.Status401Unauthorized, ChangeBranchResult.SessionGoneMessage)
            : Ok(options);
    }

    /// <summary>Switches the session to another branch and year and returns the new token and session details.</summary>
    [HttpPost("change")]
    [ProducesResponseType<LoginResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Change([FromBody] ChangeBranchRequest request, CancellationToken ct)
    {
        var result = await service.ChangeAsync(request, CurrentExpiry(), ct);
        return result.Outcome switch
        {
            ChangeBranchOutcome.Success => Ok(result.Response),
            ChangeBranchOutcome.BranchNotAllowed => Problem(StatusCodes.Status403Forbidden, ChangeBranchResult.BranchNotAllowedMessage),
            ChangeBranchOutcome.YearNotAllowed => Problem(StatusCodes.Status403Forbidden, ChangeBranchResult.YearNotAllowedMessage),
            _ => Problem(StatusCodes.Status401Unauthorized, ChangeBranchResult.SessionGoneMessage),
        };
    }

    /// <summary>The current token's expiry (its <c>exp</c> claim), so a switch never extends the login (design D3).</summary>
    private DateTimeOffset CurrentExpiry() =>
        DateTimeOffset.FromUnixTimeSeconds(long.Parse(User.FindFirst("exp")!.Value, CultureInfo.InvariantCulture));

    private ObjectResult Problem(int status, string title) =>
        new(ApiProblem.Create(HttpContext, status, title)) { StatusCode = status };
}
