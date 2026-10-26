using iErp.Shared.Auth;
using iErp.Shared;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace iErp.Admin.HolidayList;

/// <summary>
/// The holiday list of the logged-in user's branch. It needs a valid token (the default policy) and takes no
/// parameters: the company, branch and financial year are always the session's.
/// </summary>
[ApiController]
[Route("api/admin/holidays")]
[RequiresMenu(MenuCodes.HolidayList)]
public class HolidaysController(IHolidayListService service) : ControllerBase
{
    public const string NotFoundMessage = "Holiday list not found.";

    /// <summary>The holidays of the session's branch and financial year, in file order; 404 when there is no file.</summary>
    [HttpGet]
    [ProducesResponseType<HolidayListDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var list = await service.GetAsync(ct);
        return list is null
            ? new ObjectResult(ApiProblem.Create(HttpContext, StatusCodes.Status404NotFound, NotFoundMessage))
            {
                StatusCode = StatusCodes.Status404NotFound,
            }
            : Ok(list);
    }
}
