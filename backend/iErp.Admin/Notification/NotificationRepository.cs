using iErp.Data;
using Microsoft.EntityFrameworkCore;

namespace iErp.Admin.Notification;

/// <summary>The latest announcement of <c>GENINFO</c>, the one the notification bar shows.</summary>
public interface INotificationRepository
{
    /// <summary>
    /// The latest visible row with a banner or a heading (see <see cref="NotificationRepository.Latest"/>), or null when
    /// there is none.
    /// </summary>
    Task<Entities.Notification?> FindLatestAsync(CancellationToken ct = default);
}

/// <summary>Reads GENINFO, which is read-only and keyless.</summary>
public class NotificationRepository(AppDbContext db) : INotificationRepository
{
    /// <summary>The <c>VISIBLE</c> value of a row that may be shown.</summary>
    public const string VisibleFlag = "Y";

    public Task<Entities.Notification?> FindLatestAsync(CancellationToken ct = default) =>
        Latest().FirstOrDefaultAsync(ct);

    /// <summary>
    /// The visible rows (<c>VISIBLE</c> 'Y', in either case) with a banner or a heading (text other than spaces), latest
    /// first: the newest created date (rows without one after every dated row), then the highest id (rows without one
    /// last). A row with 'N', another value or no value is never shown, so when every row is 'N' there is no
    /// notification. Oracle sorts nulls first in a descending order, so the null flags come first; they are numbers, not
    /// booleans, which 10g cannot sort on. Public so tests can check the SQL.
    /// </summary>
    public IQueryable<Entities.Notification> Latest() =>
        db.Set<Entities.Notification>()
            .Where(n => n.Visible == VisibleFlag || n.Visible == "y")
            .Where(n => (n.Banner != null && n.Banner.Trim() != "") || (n.Heading != null && n.Heading.Trim() != ""))
            .OrderBy(n => n.CreatedDate == null ? 1 : 0)
            .ThenByDescending(n => n.CreatedDate)
            .ThenBy(n => n.Id == null ? 1 : 0)
            .ThenByDescending(n => n.Id);
}
