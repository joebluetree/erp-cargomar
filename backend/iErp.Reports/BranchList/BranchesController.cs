using iErp.Shared.Auth;
using iErp.Shared;
using iErp.Shared.Paging;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace iErp.Reports.BranchList;

/// <summary>
/// The Branch List report: the logged-in company's branches, and a listed branch's holiday list. The company and the
/// financial year are always the session's. The list needs the Branch List right; a branch's holidays open the Holiday
/// List screen, so they need the Holiday List right (admin-user-rights design D3).
/// </summary>
[ApiController]
[Route("api/reports/branches")]
public class BranchesController(IBranchListService service) : ControllerBase
{
    public const string HolidaysNotFoundMessage = "Holiday list not found.";

    /// <summary>One page of the company's branches, filtered by code and name and ordered by name ascending.</summary>
    [HttpGet]
    [RequiresMenu(MenuCodes.BranchList)]
    [ProducesResponseType<PagedResult<BranchListItemDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<PagedResult<BranchListItemDto>> List([FromQuery] BranchListQuery query, CancellationToken ct)
        => await service.ListAsync(query, ct);

    /// <summary>
    /// The holidays of a listed branch for the session's financial year; 404 when the branch is not one of the company's
    /// listed branches or has no holiday file.
    /// </summary>
    [HttpGet("{id}/holidays")]
    [RequiresMenu(MenuCodes.HolidayList)]
    [ProducesResponseType<BranchHolidayListDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Holidays(string id, CancellationToken ct)
    {
        var list = await service.GetHolidaysAsync(id, ct);
        return list is null
            ? new ObjectResult(ApiProblem.Create(HttpContext, StatusCodes.Status404NotFound, HolidaysNotFoundMessage))
            {
                StatusCode = StatusCodes.Status404NotFound,
            }
            : Ok(list);
    }
}
