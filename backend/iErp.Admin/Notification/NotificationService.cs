namespace iErp.Admin.Notification;

/// <summary>
/// The latest announcement, each text exactly as GENINFO holds it: the banner for the bar, the heading and the content
/// for the Notification screen.
/// </summary>
public record NotificationDto(decimal? Id, string? Banner, string? Heading, string? Content, DateTime? CreatedDate);

public interface INotificationService
{
    /// <summary>The latest notification, or null when GENINFO has none with a banner or a heading.</summary>
    Task<NotificationDto?> GetLatestAsync(CancellationToken ct = default);
}

/// <summary>
/// The same notification for every user: GENINFO has no company or branch. The texts are returned exactly as entered,
/// with their spaces and line breaks; nothing is trimmed. A row with neither a banner nor a heading (only spaces counts
/// as none) is no notification.
/// </summary>
public class NotificationService(INotificationRepository repository) : INotificationService
{
    public async Task<NotificationDto?> GetLatestAsync(CancellationToken ct = default)
    {
        var row = await repository.FindLatestAsync(ct);
        if (row is null || (string.IsNullOrWhiteSpace(row.Banner) && string.IsNullOrWhiteSpace(row.Heading))) return null;
        return new NotificationDto(row.Id, row.Banner, row.Heading, row.Content, row.CreatedDate);
    }
}
