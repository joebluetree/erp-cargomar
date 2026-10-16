using iErp.Shared;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace iErp.Admin.EmployeeProfile;

/// <summary>
/// The logged-in user's own employee profile. It needs a valid token (the default policy) and takes no employee id:
/// the employee is always the token's own.
/// </summary>
[ApiController]
[Route("api/admin/profile")]
public class EmployeeProfileController(IEmployeeProfileService service) : ControllerBase
{
    public const string NotLinkedMessage = "No employee profile is linked to this user.";

    /// <summary>The employee profile of the logged-in user.</summary>
    [HttpGet]
    [ProducesResponseType<EmployeeProfileDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var profile = await service.GetOwnAsync(ct);
        return profile is null
            ? new ObjectResult(ApiProblem.Create(HttpContext, StatusCodes.Status404NotFound, NotLinkedMessage))
            {
                StatusCode = StatusCodes.Status404NotFound,
            }
            : Ok(profile);
    }

    /// <summary>
    /// The logged-in user's own photo, from the configured images folder (design D7). It takes no id or file name; 404
    /// when there is no employee, no image name or no such photo.
    /// </summary>
    [HttpGet("photo")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Photo(CancellationToken ct)
    {
        var photo = await service.GetOwnPhotoAsync(ct);
        if (photo is null)
            return new ObjectResult(ApiProblem.Create(HttpContext, StatusCodes.Status404NotFound, NoPhotoMessage))
            {
                StatusCode = StatusCodes.Status404NotFound,
            };

        // Never kept by the browser or any cache: the URL is the same for every photo, so a kept copy would hide a file
        // replaced in the images folder. Photos are small and read once per visit to the profile.
        Response.Headers.CacheControl = "no-store";
        return PhysicalFile(photo.Path, photo.ContentType);
    }

    public const string NoPhotoMessage = "No photo is available for this employee.";
}
