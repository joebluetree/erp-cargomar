using iErp.Shared;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace iErp.Admin.UserRights;

/// <summary>
/// The logged-in user's menu and rights. It needs a valid token (the default policy) and no menu right: it is what the
/// menu itself is built from.
/// </summary>
[ApiController]
[Route("api/admin/menu")]
public class MenuController(IUserMenuService service) : ControllerBase
{
    public const int MaxCodes = 10;
    public const string CodesMessage = "Give 1 to 10 menu codes.";

    /// <summary>The session company's modules with the menus the user may see in the session branch.</summary>
    [HttpGet]
    [ProducesResponseType<UserMenuDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<UserMenuDto> Get(CancellationToken ct) => await service.GetMenuAsync(ct);

    /// <summary>
    /// The user's rights in the session branch on the menus with these codes (comma separated, 1 to 10), read live: a
    /// screen asks for its own menu and its related menus when it opens.
    /// </summary>
    [HttpGet("rights")]
    [ProducesResponseType<IReadOnlyList<MenuCodeRightsDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Rights([FromQuery] string? codes, CancellationToken ct)
    {
        var list = (codes ?? "").Split(',').Select(c => c.Trim()).ToList();
        if (list.Count > MaxCodes || list.Any(c => c.Length == 0))
            return new ObjectResult(ApiProblem.Create(HttpContext, StatusCodes.Status400BadRequest, CodesMessage))
            {
                StatusCode = StatusCodes.Status400BadRequest,
            };
        return Ok(await service.GetRightsAsync(list, ct));
    }
}
