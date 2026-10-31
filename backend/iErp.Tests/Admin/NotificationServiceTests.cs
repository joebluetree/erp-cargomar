using NSubstitute;
using iErp.Admin.Notification;

namespace iErp.Tests.Admin;

public class NotificationServiceTests
{
    private static NotificationService ServiceWith(Entities.Notification? row)
    {
        var repository = Substitute.For<INotificationRepository>();
        repository.FindLatestAsync(Arg.Any<CancellationToken>()).Returns(row);
        return new NotificationService(repository);
    }

    [Fact]
    public async Task Returns_every_text_exactly_as_entered_with_its_spaces_and_line_breaks()
    {
        var created = new DateTime(2026, 10, 28, 10, 15, 0);
        var service = ServiceWith(new Entities.Notification
        {
            Id = 7,
            Banner = "  Festival   bonus\nannounced  ",
            Heading = " Office closed on Friday ",
            Content = " The office is closed on Friday.\n\n   Please plan your work.  ",
            CreatedDate = created,
        });

        var dto = await service.GetLatestAsync();

        Assert.Equal(new NotificationDto(
            7, "  Festival   bonus\nannounced  ", " Office closed on Friday ", " The office is closed on Friday.\n\n   Please plan your work.  ", created), dto);
    }

    [Fact]
    public async Task A_row_with_a_heading_but_no_banner_is_a_notification()
    {
        var dto = await ServiceWith(new Entities.Notification { Heading = "Heading", Content = null }).GetLatestAsync();

        Assert.Equal(new NotificationDto(null, null, "Heading", null, null), dto);
    }

    [Fact]
    public async Task A_row_with_a_banner_but_no_heading_is_a_notification()
    {
        var dto = await ServiceWith(new Entities.Notification { Banner = "Banner" }).GetLatestAsync();

        Assert.Equal("Banner", dto!.Banner);
        Assert.Null(dto.Heading);
    }

    [Fact]
    public async Task No_row_gives_no_notification() =>
        Assert.Null(await ServiceWith(null).GetLatestAsync());

    [Theory]
    [InlineData(null, null)]
    [InlineData("  ", null)]
    [InlineData(null, " \n ")]
    public async Task A_row_without_banner_and_heading_gives_no_notification(string? banner, string? heading) =>
        Assert.Null(await ServiceWith(new Entities.Notification { Banner = banner, Heading = heading, Content = "Text" }).GetLatestAsync());
}
