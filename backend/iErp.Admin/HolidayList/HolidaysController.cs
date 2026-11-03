using iErp.Shared.Auth;
using iErp.Shared;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace iErp.Admin.HolidayList;

/// <summary>The name an uploaded holiday file was saved under.</summary>
public record HolidayUploadDto(string FileName);

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
    public const string NoUploadRightMessage = "You may not upload holiday lists.";
    /// <summary>Bodies above this are stopped by the server (413); between 100 KB and this the service names the limit.</summary>
    public const int MaxRequestBytes = 1024 * 1024;

    /// <summary>
    /// Saves an uploaded holiday file in the holiday folder under its own name (admin-list-upload design D1). Needs the
    /// Holiday List's view right (the class filter) and its admin right in the session branch, checked before the
    /// file is read; the admin user has both. 409 when the file exists and <paramref name="replace"/> is not set.
    /// </summary>
    [HttpPost("file")]
    [RequestSizeLimit(MaxRequestBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxRequestBytes)]
    [ProducesResponseType<HolidayUploadDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status403Forbidden)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Upload(
        IFormFile? file, [FromForm] bool replace, [FromServices] IMenuAccess access,
        [FromServices] IHolidayUploadService upload, CancellationToken ct)
    {
        if (!await access.IsAdminAsync(MenuCodes.HolidayList, ct))
            return Refusal(StatusCodes.Status403Forbidden, NoUploadRightMessage);

        byte[]? content = null;
        if (file is not null)
        {
            using var stream = new MemoryStream();
            await file.CopyToAsync(stream, ct);
            content = stream.ToArray();
        }

        var result = await upload.UploadAsync(file?.FileName, content, replace, ct);
        return result.Outcome switch
        {
            HolidayUploadOutcome.Saved => Ok(new HolidayUploadDto(result.FileName!)),
            HolidayUploadOutcome.Exists => Refusal(StatusCodes.Status409Conflict, result.Message!),
            _ => Refusal(StatusCodes.Status400BadRequest, result.Message!),
        };
    }

    private ObjectResult Refusal(int status, string message) =>
        new(ApiProblem.Create(HttpContext, status, message)) { StatusCode = status };

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
