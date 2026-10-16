using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.JsonWebTokens;
using NSubstitute;
using iErp.Admin.ChangeBranch;
using iErp.Entities;
using iErp.Shared.Auth;
using iErp.Tests.TestSupport;

namespace iErp.Tests.Integration;

/// <summary>
/// GET /api/admin/session/options and POST /api/admin/session/change through the real pipeline with a fake
/// repository. No database needed; the repository has no write methods, so nothing can be written.
/// </summary>
public class ChangeBranchEndpointTests
{
    // Whole seconds, as a token stores its expiry.
    private static readonly DateTimeOffset Expiry =
        DateTimeOffset.FromUnixTimeSeconds(DateTimeOffset.UtcNow.AddMinutes(42).ToUnixTimeSeconds());

    private static (HttpClient Client, IChangeBranchRepository Repository) ClientWith(bool authenticated = true)
    {
        var mumbai = new Company { Id = "b-2", Type = "B", ParentId = "c-1", Name = "Mumbai" };
        var y2024 = new FinancialYear { Id = "y-0", Code = 2024, Name = "2024-2025", CompanyCode = "CMP" };
        var repository = Substitute.For<IChangeBranchRepository>();
        repository.FindActiveUserAsync("u-1", Arg.Any<CancellationToken>())
            .Returns(new User { Id = "u-1", Code = "U01", Name = "ADMIN", CompanyCode = "CMP", BranchId = "b-1", EmployeeId = "e-1" });
        repository.FindCompanyAsync("c-1", Arg.Any<CancellationToken>())
            .Returns(new Company { Id = "c-1", Type = "C", Code = "CMP", Name = "Cargomar Pvt Ltd" });
        repository.ListBranchesAsync("u-1", "c-1", Arg.Any<CancellationToken>())
            .Returns([new Company { Id = "b-1", Type = "B", ParentId = "c-1", Name = "Kochi" }, mumbai]);
        repository.FindBranchAsync("u-1", "c-1", "b-2", Arg.Any<CancellationToken>()).Returns(mumbai);
        repository.ListYearsAsync("CMP", Arg.Any<CancellationToken>())
            .Returns([new FinancialYear { Id = "y-1", Code = 2025, Name = "2025-2026", CompanyCode = "CMP" }, y2024]);
        repository.FindYearAsync("CMP", "y-0", Arg.Any<CancellationToken>()).Returns(y2024);

        var client = new ApiFactory().WithWebHostBuilder(b => b.ConfigureServices(s => s.AddScoped(_ => repository)))
            .CreateClient();
        return (authenticated ? client.Authenticated(TestTokens.Create(expires: Expiry)) : client, repository);
    }

    private static Task<HttpResponseMessage> ChangeAsync(HttpClient client, object body) =>
        client.PostAsJsonAsync("/api/admin/session/change", body);

    private static async Task<JsonElement> ProblemAsync(HttpResponseMessage response, HttpStatusCode status)
    {
        Assert.Equal(status, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal((int)status, body.GetProperty("status").GetInt32());
        return body;
    }

    [Fact]
    public async Task Both_endpoints_need_a_token()
    {
        var (client, repository) = ClientWith(authenticated: false);

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/admin/session/options")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await ChangeAsync(client, new { branchId = "b-2", yearId = "y-0" })).StatusCode);
        Assert.Empty(repository.ReceivedCalls());
    }

    [Fact]
    public async Task Options_list_the_allowed_branches_and_the_company_years_in_order()
    {
        var (client, _) = ClientWith();

        var body = await client.GetFromJsonAsync<JsonElement>("/api/admin/session/options");

        Assert.Equal(["Kochi", "Mumbai"], body.GetProperty("branches").EnumerateArray().Select(b => b.GetProperty("name").GetString()));
        Assert.Equal(["b-1", "b-2"], body.GetProperty("branches").EnumerateArray().Select(b => b.GetProperty("id").GetString()));
        var years = body.GetProperty("years").EnumerateArray().ToList();
        Assert.Equal(["2025-2026", "2024-2025"], years.Select(y => y.GetProperty("name").GetString()));
        Assert.Equal(("y-1", "2025"), (years[0].GetProperty("id").GetString(), years[0].GetProperty("code").GetString()));
    }

    [Fact]
    public async Task A_switch_returns_a_new_token_with_the_new_branch_and_year_and_the_same_expiry()
    {
        var (client, _) = ClientWith();

        var response = await ChangeAsync(client, new { branchId = "b-2", yearId = "y-0" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        var session = body.GetProperty("session");
        Assert.Equal(("Mumbai", "2024-2025", "Cargomar Pvt Ltd", "ADMIN"), (session.GetProperty("branchName").GetString(),
            session.GetProperty("yearName").GetString(), session.GetProperty("companyName").GetString(), session.GetProperty("userName").GetString()));
        Assert.Equal(Expiry, body.GetProperty("expiresAt").GetDateTimeOffset());
        Assert.Equal("e-1", session.GetProperty("employeeId").GetString());

        var token = new JsonWebToken(body.GetProperty("token").GetString());
        Assert.Equal(Expiry.UtcDateTime, token.ValidTo);
        Assert.Equal(("b-2", "y-0"), (token.GetClaim(SessionClaims.BranchId).Value, token.GetClaim(SessionClaims.YearId).Value));

        // The new token is accepted by the API and carries the switched branch.
        client.Authenticated(token.EncodedToken);
        var current = await client.GetFromJsonAsync<JsonElement>("/test-endpoints/session");
        Assert.Equal("b-2", current.GetProperty("branchId").GetString());
        Assert.Equal("e-1", current.GetProperty("employeeId").GetString());
    }

    [Fact]
    public async Task A_branch_that_is_not_allotted_returns_403()
    {
        var (client, _) = ClientWith();

        var body = await ProblemAsync(await ChangeAsync(client, new { branchId = "b-9", yearId = "y-0" }), HttpStatusCode.Forbidden);

        Assert.Equal("This branch is not available to you.", body.GetProperty("title").GetString());
        Assert.False(body.TryGetProperty("token", out _));
    }

    [Fact]
    public async Task A_year_of_another_company_returns_403()
    {
        var (client, _) = ClientWith();

        var body = await ProblemAsync(await ChangeAsync(client, new { branchId = "b-2", yearId = "y-9" }), HttpStatusCode.Forbidden);

        Assert.Equal("This financial year is not available for your company.", body.GetProperty("title").GetString());
    }

    [Fact]
    public async Task A_closed_year_returns_403_and_no_token()
    {
        // The repository finds open years only, so a closed year of the company is "not found", like another company's.
        var (client, repository) = ClientWith();

        var body = await ProblemAsync(await ChangeAsync(client, new { branchId = "b-2", yearId = "y-closed" }), HttpStatusCode.Forbidden);

        Assert.Equal("This financial year is not available for your company.", body.GetProperty("title").GetString());
        Assert.False(body.TryGetProperty("token", out _));
        await repository.Received(1).FindYearAsync("CMP", "y-closed", Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Missing_values_return_400_naming_each_and_check_nothing()
    {
        var (client, repository) = ClientWith();

        var body = await ProblemAsync(await ChangeAsync(client, new { branchId = " " }), HttpStatusCode.BadRequest);

        var errors = body.GetProperty("errors");
        Assert.Equal("Branch is required.", errors.GetProperty("BranchId")[0].GetString());
        Assert.Equal("Year is required.", errors.GetProperty("YearId")[0].GetString());
        Assert.Empty(repository.ReceivedCalls());
    }

    [Theory]
    [InlineData("GET", "/api/admin/session/change")]
    [InlineData("PUT", "/api/admin/session/change")]
    [InlineData("POST", "/api/admin/session/options")]
    [InlineData("DELETE", "/api/admin/session/options")]
    public async Task Other_methods_return_405(string method, string url)
    {
        var (client, _) = ClientWith();

        var response = await client.SendAsync(new HttpRequestMessage(new HttpMethod(method), url));

        Assert.Equal(HttpStatusCode.MethodNotAllowed, response.StatusCode);
    }
}
