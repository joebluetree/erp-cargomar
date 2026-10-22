using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;
using iErp.Entities;
using iErp.Admin.HolidayList;
using iErp.SharedBusiness.Holidays;
using iErp.Tests.TestSupport;

namespace iErp.Tests.Integration;

/// <summary>
/// GET /api/admin/holidays through the real pipeline with a fake repository and a temporary holiday folder. The test
/// token's company is CMP, its branch b-1 (code KOC) and its year y-1 (code 2026).
/// </summary>
public sealed class HolidayListEndpointTests : IDisposable
{
    private readonly string folder = Directory.CreateTempSubdirectory("ierp-holiday-list-").FullName;

    public void Dispose() => Directory.Delete(folder, recursive: true);

    private (HttpClient Client, IHolidayListRepository Repository) ClientWith(bool authenticated = true)
    {
        var repository = Substitute.For<IHolidayListRepository>();
        repository.FindBranchAsync("b-1", Arg.Any<CancellationToken>()).Returns(new Company { Id = "b-1", Type = "B", Code = "KOC", Name = "Kochi" });
        repository.FindYearCodeAsync("y-1", Arg.Any<CancellationToken>()).Returns(2026m);

        var client = new ApiFactory().WithWebHostBuilder(b => b.ConfigureServices(s =>
        {
            s.AddScoped(_ => repository);
            s.Configure<HolidayListsOptions>(o => o.Folder = folder);
        })).CreateClient();
        return (authenticated ? client.Authenticated() : client, repository);
    }

    [Fact]
    public async Task Returns_the_holidays_of_the_session_file_in_file_order_in_camel_case()
    {
        File.WriteAllLines(Path.Combine(folder, "CMP-KOC-2026.txt"), ["Holiday,Day,Date", "Republic Day,Monday,26-01-2026", "", "Local festival"]);
        var (client, _) = ClientWith();

        var body = await client.GetFromJsonAsync<JsonElement>("/api/admin/holidays");

        Assert.Equal(("KOC", "Kochi"), (body.GetProperty("branchCode").GetString(), body.GetProperty("branchName").GetString()));
        var items = body.GetProperty("items").EnumerateArray().ToList();
        Assert.Equal(2, items.Count);
        Assert.Equal(("Republic Day", "Monday", "26-01-2026"),
            (items[0].GetProperty("holiday").GetString(), items[0].GetProperty("day").GetString(), items[0].GetProperty("date").GetString()));
        Assert.Equal("Local festival", items[1].GetProperty("holiday").GetString());
        Assert.Equal(JsonValueKind.Null, items[1].GetProperty("day").ValueKind);
        Assert.Equal(JsonValueKind.Null, items[1].GetProperty("date").ValueKind);
    }

    [Fact]
    public async Task Without_a_file_it_answers_404_with_the_message()
    {
        File.WriteAllText(Path.Combine(folder, "CMP-KOC-2025.txt"), "Another year, 01-01-2025");
        var (client, _) = ClientWith();

        var response = await client.GetAsync("/api/admin/holidays");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(HolidaysController.NotFoundMessage, body.GetProperty("title").GetString());
    }

    [Fact]
    public async Task Needs_a_token()
    {
        File.WriteAllText(Path.Combine(folder, "CMP-KOC-2026.txt"), "Republic Day, 26-01-2026");
        var (client, repository) = ClientWith(authenticated: false);

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/admin/holidays")).StatusCode);
        Assert.Empty(repository.ReceivedCalls());
    }
}
