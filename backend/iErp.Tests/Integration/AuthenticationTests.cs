using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;
using iErp.Entities;
using iErp.Reports.CompanyList;
using iErp.Tests.TestSupport;

namespace iErp.Tests.Integration;

/// <summary>Every endpoint except the login requires a valid access token. No database needed.</summary>
public class AuthenticationTests
{
    private static (HttpClient Client, ICompanyListRepository Repository) CompaniesClient()
    {
        var repository = Substitute.For<ICompanyListRepository>();
        repository.ListCompaniesAsync(Arg.Any<CompanyListQuery>(), Arg.Any<CancellationToken>())
            .Returns((Array.Empty<Company>(), 0));
        var client = new ApiFactory().WithWebHostBuilder(b => b.ConfigureServices(s => s.AddScoped(_ => repository)))
            .CreateClient();
        return (client, repository);
    }

    private static async Task AssertUnauthorizedAsync(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(401, body.GetProperty("status").GetInt32());
        Assert.Equal("Authentication is required.", body.GetProperty("title").GetString());
        Assert.True(body.TryGetProperty("traceId", out _));
    }

    [Fact]
    public async Task Without_a_token_the_companies_endpoint_answers_401_and_reads_nothing()
    {
        var (client, repository) = CompaniesClient();

        await AssertUnauthorizedAsync(await client.GetAsync("/api/reports/companies"));
        await repository.DidNotReceiveWithAnyArgs().ListCompaniesAsync(default!, default);
    }

    [Fact]
    public async Task An_expired_token_is_refused()
    {
        var (client, _) = CompaniesClient();
        client.Authenticated(TestTokens.Create(expires: DateTimeOffset.UtcNow.AddMinutes(-5)));

        await AssertUnauthorizedAsync(await client.GetAsync("/api/reports/companies"));
    }

    [Fact]
    public async Task A_token_signed_with_another_key_is_refused()
    {
        var (client, _) = CompaniesClient();
        client.Authenticated(TestTokens.Create(key: "another-key-that-is-long-enough-0123456789"));

        await AssertUnauthorizedAsync(await client.GetAsync("/api/reports/companies"));
    }

    [Fact]
    public async Task A_changed_token_is_refused()
    {
        var (client, _) = CompaniesClient();
        var parts = TestTokens.Create().Split('.');
        // Swap in the payload of a token for another company, keeping the original signature.
        var otherPayload = TestTokens.Create(companyId: "c-2").Split('.')[1];
        client.Authenticated($"{parts[0]}.{otherPayload}.{parts[2]}");

        await AssertUnauthorizedAsync(await client.GetAsync("/api/reports/companies"));
    }

    [Fact]
    public async Task A_token_for_another_issuer_is_refused()
    {
        var (client, _) = CompaniesClient();
        client.Authenticated(TestTokens.Create(issuer: "someone-else"));

        await AssertUnauthorizedAsync(await client.GetAsync("/api/reports/companies"));
    }

    [Fact]
    public async Task With_a_valid_token_the_companies_endpoint_answers_as_before()
    {
        var (client, repository) = CompaniesClient();
        client.Authenticated();

        var response = await client.GetAsync("/api/reports/companies");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await repository.ReceivedWithAnyArgs(1).ListCompaniesAsync(default!, default);
    }

    [Fact]
    public async Task An_endpoint_without_any_authentication_attribute_requires_a_token()
    {
        var client = new ApiFactory().CreateClient();

        await AssertUnauthorizedAsync(await client.PostAsJsonAsync("/test-endpoints/echo", new { name = "ok" }));
    }

    [Fact]
    public async Task A_wrong_method_still_answers_405()
    {
        var client = new ApiFactory().CreateClient();

        var response = await client.DeleteAsync("/api/reports/companies");

        Assert.Equal(HttpStatusCode.MethodNotAllowed, response.StatusCode);
    }

    [Fact]
    public async Task The_current_session_comes_from_the_token()
    {
        var client = new ApiFactory().CreateClient()
            .Authenticated(TestTokens.Create(companyId: "c-9", branchId: "b-9", yearId: "y-9", employeeId: "e-9"));

        var body = await client.GetFromJsonAsync<JsonElement>("/test-endpoints/session");

        Assert.True(body.GetProperty("isAuthenticated").GetBoolean());
        Assert.Equal("u-1", body.GetProperty("userId").GetString());
        Assert.Equal("U01", body.GetProperty("userCode").GetString());
        Assert.Equal("c-9", body.GetProperty("companyId").GetString());
        Assert.Equal("CMP", body.GetProperty("companyCode").GetString());
        Assert.Equal("b-9", body.GetProperty("branchId").GetString());
        Assert.Equal("y-9", body.GetProperty("yearId").GetString());
        Assert.Equal("e-9", body.GetProperty("employeeId").GetString());
    }

    [Fact]
    public async Task A_token_without_an_employee_gives_no_current_employee()
    {
        var client = new ApiFactory().CreateClient().Authenticated(TestTokens.Create());

        var body = await client.GetFromJsonAsync<JsonElement>("/test-endpoints/session");

        Assert.Equal(JsonValueKind.Null, body.GetProperty("employeeId").ValueKind);
        Assert.Equal("U01", body.GetProperty("userCode").GetString());
    }
}
