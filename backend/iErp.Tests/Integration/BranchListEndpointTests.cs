using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;
using iErp.Entities;
using iErp.Reports.BranchList;
using iErp.SharedBusiness.Holidays;
using iErp.Tests.TestSupport;

namespace iErp.Tests.Integration;

/// <summary>
/// GET /api/reports/branches and /{id}/holidays through the real pipeline with a fake repository and a temporary
/// holiday folder. The test token's company is c-1 (code CMP) and its year y-1 (code 2026).
/// </summary>
public sealed class BranchListEndpointTests : IDisposable
{
    private readonly string folder = Directory.CreateTempSubdirectory("ierp-branch-list-").FullName;

    public void Dispose() => Directory.Delete(folder, recursive: true);

    private (HttpClient Client, IBranchListRepository Repository) ClientWith(bool authenticated = true)
    {
        var repository = Substitute.For<IBranchListRepository>();
        repository.ListAsync(Arg.Any<BranchListQuery>(), "c-1", Arg.Any<CancellationToken>()).Returns(
            ((IReadOnlyList<Company>)[new Company { Id = "b-2", Type = "B", Code = "BLRAF", Name = "Bangalore", Email = "blr@x.com" }], 16));
        repository.FindListedAsync("b-2", "c-1", Arg.Any<CancellationToken>())
            .Returns(new Company { Id = "b-2", Type = "B", Code = "BLRAF", Name = "Bangalore" });
        repository.FindYearCodeAsync("y-1", Arg.Any<CancellationToken>()).Returns(2026m);

        var client = new ApiFactory().WithWebHostBuilder(b => b.ConfigureServices(s =>
        {
            s.AddScoped(_ => repository);
            s.Configure<HolidayListsOptions>(o => o.Folder = folder);
        })).CreateClient();
        return (authenticated ? client.Authenticated() : client, repository);
    }

    [Fact]
    public async Task The_list_returns_a_camel_case_page_of_the_session_company_s_branches()
    {
        var (client, repository) = ClientWith();

        var body = await client.GetFromJsonAsync<JsonElement>("/api/reports/branches?code=blr&page=2&pageSize=5");

        Assert.Equal((16, 2, 5), (body.GetProperty("total").GetInt32(), body.GetProperty("page").GetInt32(), body.GetProperty("pageSize").GetInt32()));
        var row = body.GetProperty("items").EnumerateArray().Single();
        Assert.Equal(("b-2", "BLRAF", "Bangalore", "", "blr@x.com"),
            (row.GetProperty("id").GetString(), row.GetProperty("code").GetString(), row.GetProperty("name").GetString(),
             row.GetProperty("address1").GetString(), row.GetProperty("email").GetString()));
        await repository.Received(1).ListAsync(Arg.Is<BranchListQuery>(q => q!.Code == "blr" && q.Page == 2 && q.PageSize == 5), "c-1", Arg.Any<CancellationToken>());
    }

    [Theory]
    [InlineData("page=0", "Page")]
    [InlineData("pageSize=7", "PageSize")]
    public async Task Invalid_paging_values_answer_400_naming_the_field(string queryString, string field)
    {
        var (client, repository) = ClientWith();

        var response = await client.GetAsync($"/api/reports/branches?{queryString}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(body.GetProperty("errors").TryGetProperty(field, out _));
        Assert.Empty(repository.ReceivedCalls());
    }

    [Fact]
    public async Task A_listed_branch_s_holidays_come_from_its_file()
    {
        File.WriteAllLines(Path.Combine(folder, "CMP-BLRAF-2026.txt"), ["Holiday,Day,Date", "Republic Day,Monday,26-January-2026"]);
        var (client, _) = ClientWith();

        var body = await client.GetFromJsonAsync<JsonElement>("/api/reports/branches/b-2/holidays");

        Assert.Equal(("BLRAF", "Bangalore"), (body.GetProperty("branchCode").GetString(), body.GetProperty("branchName").GetString()));
        var holiday = body.GetProperty("items").EnumerateArray().Single();
        Assert.Equal(("Republic Day", "Monday", "26-January-2026"),
            (holiday.GetProperty("holiday").GetString(), holiday.GetProperty("day").GetString(), holiday.GetProperty("date").GetString()));
    }

    [Theory]
    [InlineData("b-other")]
    [InlineData("b-2")]
    public async Task An_unlisted_branch_or_a_missing_file_answers_404(string id)
    {
        // b-2 is listed but has no file in the folder; b-other is not one of the company's branches.
        File.WriteAllText(Path.Combine(folder, "CMP-OTHER-2026.txt"), "Other, 01-01-2026");
        var (client, _) = ClientWith();

        var response = await client.GetAsync($"/api/reports/branches/{id}/holidays");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(BranchesController.HolidaysNotFoundMessage, body.GetProperty("title").GetString());
    }

    [Theory]
    [InlineData("/api/reports/branches")]
    [InlineData("/api/reports/branches/b-2/holidays")]
    public async Task Every_endpoint_needs_a_token(string url)
    {
        var (client, repository) = ClientWith(authenticated: false);

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync(url)).StatusCode);
        Assert.Empty(repository.ReceivedCalls());
    }
}
