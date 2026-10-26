using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;
using iErp.Admin.ChangeBranch;
using iErp.Admin.Login;
using iErp.Entities;
using iErp.Shared.Lib;

namespace iErp.Tests.Integration;

/// <summary>POST /api/admin/login/auto through the real pipeline with fake repositories. No database needed.</summary>
public class AutoLoginEndpointTests
{
    private const string AppId = "6f1c2a7e-0b9d-4c55-9a51-2f6d8e3b7a10";
    private const string Password = "PA55WORD";

    private static (HttpClient Client, ILoginRepository Repository) ClientWith(string? loggedOut = "N", bool known = true)
    {
        var repository = Substitute.For<ILoginRepository>();
        repository.FindAppDetailsAsync(Arg.Any<string>(), Arg.Any<CancellationToken>()).Returns(known
            ? [new AppDetail { Id = AppId, UserCode = "U01", Password = "pa55word", CompanyCode = "CMP", BranchId = "b-2", YearId = "y-1", LoggedOut = loggedOut }]
            : []);
        repository.FindUsersAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>()).Returns(
            [new User { Id = "u-1", Code = "U01", Name = "ADMIN", Password = Lib.Encrypt(Password), CompanyCode = "CMP", BranchId = "b-1" }]);
        repository.FindCompanyAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(new Company { Id = "c-1", Type = "C", Code = "CMP", Name = "Cargomar Pvt Ltd" });

        var switchable = Substitute.For<IChangeBranchRepository>();
        switchable.FindBranchAsync("u-1", "c-1", "b-2", Arg.Any<CancellationToken>())
            .Returns(new Company { Id = "b-2", Type = "B", ParentId = "c-1", Name = "Chennai" });
        switchable.FindYearAsync("CMP", "y-1", Arg.Any<CancellationToken>())
            .Returns(new FinancialYear { Id = "y-1", Code = 2024, Name = "2024-2025", CompanyCode = "CMP" });

        var client = new ApiFactory().WithWebHostBuilder(b => b.ConfigureServices(s =>
        {
            s.AddScoped(_ => repository);
            s.AddScoped(_ => switchable);
        })).CreateClient();
        return (client, repository);
    }

    private static Task<HttpResponseMessage> PostAsync(HttpClient client, object body) =>
        client.PostAsJsonAsync("/api/admin/login/auto", body);

    private static async Task<JsonElement> ProblemAsync(HttpResponseMessage response, HttpStatusCode status)
    {
        Assert.Equal(status, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal((int)status, body.GetProperty("status").GetInt32());
        return body;
    }

    [Fact]
    public async Task A_logged_in_row_without_a_token_returns_200_and_a_token_that_opens_the_protected_endpoints()
    {
        var (client, _) = ClientWith();

        var response = await PostAsync(client, new { appId = AppId });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Chennai", body.GetProperty("session").GetProperty("branchName").GetString());
        Assert.Equal("y-1", body.GetProperty("session").GetProperty("yearId").GetString());
        Assert.True(body.GetProperty("expiresAt").GetDateTimeOffset() > DateTimeOffset.UtcNow.AddHours(7));

        client.DefaultRequestHeaders.Authorization = new("Bearer", body.GetProperty("token").GetString());
        var session = await client.GetFromJsonAsync<JsonElement>("/test-endpoints/session");
        Assert.Equal("b-2", session.GetProperty("branchId").GetString());
    }

    [Fact]
    public async Task An_unknown_id_and_a_logged_out_row_return_the_same_401_problem()
    {
        var bodies = new List<string>();
        foreach (var client in new[] { ClientWith(known: false).Client, ClientWith(loggedOut: "Y").Client })
        {
            var body = await ProblemAsync(await PostAsync(client, new { appId = AppId }), HttpStatusCode.Unauthorized);
            Assert.Equal("Automatic login failed. Please log in.", body.GetProperty("title").GetString());
            Assert.False(body.TryGetProperty("token", out _));
            bodies.Add(string.Join(",", body.EnumerateObject().Select(p => p.Name)));
        }

        Assert.Single(bodies.Distinct());
    }

    [Fact]
    public async Task A_missing_app_id_returns_400_naming_it_and_reads_nothing()
    {
        var (client, repository) = ClientWith();

        var body = await ProblemAsync(await PostAsync(client, new { }), HttpStatusCode.BadRequest);

        Assert.Equal("App id is required.", body.GetProperty("errors").GetProperty("AppId")[0].GetString());
        await repository.DidNotReceiveWithAnyArgs().FindAppDetailsAsync(default!, default);
    }

    [Fact]
    public async Task A_too_long_app_id_returns_400()
    {
        var body = await ProblemAsync(await PostAsync(ClientWith().Client, new { appId = new string('a', 81) }), HttpStatusCode.BadRequest);

        Assert.True(body.GetProperty("errors").TryGetProperty("AppId", out _));
    }

    [Theory]
    [InlineData("GET")]
    [InlineData("PUT")]
    [InlineData("PATCH")]
    [InlineData("DELETE")]
    public async Task Other_methods_return_405(string method)
    {
        var (client, repository) = ClientWith();

        var response = await client.SendAsync(new HttpRequestMessage(new HttpMethod(method), "/api/admin/login/auto"));

        Assert.Equal(HttpStatusCode.MethodNotAllowed, response.StatusCode);
        await repository.DidNotReceiveWithAnyArgs().FindAppDetailsAsync(default!, default);
    }
}
