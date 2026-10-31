using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;
using iErp.Admin.Notification;
using iErp.Shared.Auth;
using iErp.Tests.TestSupport;

namespace iErp.Tests.Integration;

/// <summary>GET /api/admin/notification through the real pipeline with a fake repository.</summary>
public class NotificationEndpointTests
{
    private static (HttpClient Client, INotificationRepository Repository) ClientWith(
        Entities.Notification? row, bool authenticated = true, IMenuAccess? access = null)
    {
        var repository = Substitute.For<INotificationRepository>();
        repository.FindLatestAsync(Arg.Any<CancellationToken>()).Returns(row);

        var client = new ApiFactory().WithWebHostBuilder(b => b.ConfigureServices(s =>
        {
            s.AddScoped(_ => repository);
            if (access is not null) s.AddScoped(_ => access);
        })).CreateClient();
        return (authenticated ? client.Authenticated() : client, repository);
    }

    private static readonly Entities.Notification Row = new()
    {
        Id = 7, Banner = "  Festival bonus\nannounced ", Heading = "Office closed on Friday", Content = "Closed.\nPlan ahead.", CreatedDate = new DateTime(2026, 10, 28, 10, 15, 0),
    };

    [Fact]
    public async Task Returns_the_latest_notification_in_camel_case()
    {
        var (client, _) = ClientWith(Row);

        var body = await client.GetFromJsonAsync<JsonElement>("/api/admin/notification");

        Assert.Equal(7m, body.GetProperty("id").GetDecimal());
        Assert.Equal("  Festival bonus\nannounced ", body.GetProperty("banner").GetString());
        Assert.Equal("Office closed on Friday", body.GetProperty("heading").GetString());
        Assert.Equal("Closed.\nPlan ahead.", body.GetProperty("content").GetString());
        Assert.Equal(new DateTime(2026, 10, 28, 10, 15, 0), body.GetProperty("createdDate").GetDateTime());
    }

    [Fact]
    public async Task Without_a_notification_it_answers_404_with_the_message()
    {
        var (client, _) = ClientWith(null);

        var response = await client.GetAsync("/api/admin/notification");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(NotificationController.NotFoundMessage, body.GetProperty("title").GetString());
    }

    [Fact]
    public async Task Needs_a_token()
    {
        var (client, repository) = ClientWith(Row, authenticated: false);

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/admin/notification")).StatusCode);
        Assert.Empty(repository.ReceivedCalls());
    }

    [Fact]
    public async Task Needs_no_menu_right()
    {
        var access = new FakeMenuAccess(allow: false);
        var (client, _) = ClientWith(Row, access: access);

        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/admin/notification")).StatusCode);
        Assert.Empty(access.Asked);
    }
}
