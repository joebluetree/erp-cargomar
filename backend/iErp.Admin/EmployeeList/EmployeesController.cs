using iErp.Shared.Auth;
using iErp.Admin.EmployeeProfile;
using iErp.Shared;
using iErp.Shared.Paging;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace iErp.Admin.EmployeeList;

/// <summary>
/// The Employee List and the profile and photo of a listed employee. All need a valid token (the default policy) and
/// see only the employees of the session's company and branch who are not relieved; any other id answers 404.
/// The list needs the Employee List right; an employee's profile and photo open the Profile screen, so they need the
/// Profile right (admin-user-rights design D3).
/// </summary>
[ApiController]
[Route("api/admin/employees")]
public class EmployeesController(IEmployeeListService list, IEmployeeProfileService profiles) : ControllerBase
{
    public const string NotFoundMessage = "Employee not found.";

    /// <summary>One page of employees, filtered by code and name and ordered by name.</summary>
    [HttpGet]
    [RequiresMenu(MenuCodes.EmployeeList)]
    [ProducesResponseType<PagedResult<EmployeeListItemDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<PagedResult<EmployeeListItemDto>> List([FromQuery] EmployeeListQuery query, CancellationToken ct)
        => await list.ListAsync(query, ct);

    /// <summary>The profile of a listed employee.</summary>
    [HttpGet("{id}")]
    [RequiresMenu(MenuCodes.EmployeeProfile)]
    [ProducesResponseType<EmployeeProfileDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(string id, CancellationToken ct)
    {
        var profile = await profiles.GetAsync(id, ct);
        return profile is null ? NotFound() : Ok(profile);
    }

    /// <summary>The photo of a listed employee, never cached (the same rules as the own photo, design D7).</summary>
    [HttpGet("{id}/photo")]
    [RequiresMenu(MenuCodes.EmployeeProfile)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Photo(string id, CancellationToken ct)
    {
        var photo = await profiles.GetPhotoAsync(id, ct);
        if (photo is null)
            return NotFound();

        Response.Headers.CacheControl = "no-store";
        return PhysicalFile(photo.Path, photo.ContentType);
    }

    private new ObjectResult NotFound() =>
        new(ApiProblem.Create(HttpContext, StatusCodes.Status404NotFound, NotFoundMessage)) { StatusCode = StatusCodes.Status404NotFound };
}
