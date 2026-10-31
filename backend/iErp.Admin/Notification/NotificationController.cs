using iErp.Shared;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace iErp.Admin.Notification;

/// <summary>
/// The latest announcement, for the notification bar and the Notification screen. It needs a valid token (the default
/// policy) but no menu right, as every logged-in user sees the bar, and it takes no parameters.
/// </summary>
[ApiController]
[Route("api/admin/notification")]
public class NotificationController(INotificationService service) : ControllerBase
{
    public const string NotFoundMessage = "Notification not found.";

    /// <summary>The latest notification; 404 when there is none.</summary>
    [HttpGet]
    [ProducesResponseType<NotificationDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var notification = await service.GetLatestAsync(ct);
        return notification is null
            ? new ObjectResult(ApiProblem.Create(HttpContext, StatusCodes.Status404NotFound, NotFoundMessage))
            {
                StatusCode = StatusCodes.Status404NotFound,
            }
            : Ok(notification);
    }
}
