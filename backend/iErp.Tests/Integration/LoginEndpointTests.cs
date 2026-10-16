using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;
using iErp.Admin.Login;
using iErp.Entities;
using iErp.Shared.Lib;

namespace iErp.Tests.Integration;

/// <summary>POST /api/admin/login through the real pipeline with a fake repository. No database needed.</summary>
public class LoginEndpointTests
{
    private const string Password = "Pa55word";

    private static (HttpClient Client, ILoginRepository Repository) ClientWith(
        User[]? users = null, bool company = true, bool branch = true, bool year = true)
    {
        var repository = Substitute.For<ILoginRepository>();
        repository.FindUsersAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>()).Returns(users ??
            [new User { Id = "u-1", Code = "U01", Name = "ADMIN", Password = Lib.Encrypt(Password), CompanyCode = "CMP", BranchId = "b-1", EmployeeId = "e-1" }]);
        repository.FindCompanyAsync(Arg.Any<string>(), Arg.Any<CancellationToken>()).Returns(company
            ? new Company { Id = "c-1", Type = "C", Code = "CMP", Name = "Cargomar Pvt Ltd" } : null);
        repository.FindBranchAsync(Arg.Any<string>(), Arg.Any<CancellationToken>()).Returns(branch
            ? new Company { Id = "b-1", Type = "B", ParentId = "c-1", Name = "Kochi" } : null);
        repository.FindLatestYearAsync(Arg.Any<string>(), Arg.Any<CancellationToken>()).Returns(year
            ? new FinancialYear { Id = "y-1", Code = 2025, Name = "2025-2026", CompanyCode = "CMP" } : null);

        var client = new ApiFactory().WithWebHostBuilder(b => b.ConfigureServices(s => s.AddScoped(_ => repository)))
            .CreateClient();
        return (client, repository);
    }

    private static Task<HttpResponseMessage> PostAsync(HttpClient client, object body) =>
        client.PostAsJsonAsync("/api/admin/login", body);

    private static object Credentials(string password = Password) =>
        new { userCode = "u01", password, companyCode = "cmp" };

    private static async Task<JsonElement> ProblemAsync(HttpResponseMessage response, HttpStatusCode status)
    {
        Assert.Equal(status, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal((int)status, body.GetProperty("status").GetInt32());
        Assert.True(body.TryGetProperty("traceId", out _));
        return body;
    }

    [Fact]
    public async Task Correct_credentials_without_a_token_return_200_with_the_token_and_session()
    {
        var (client, _) = ClientWith();

        var response = await PostAsync(client, Credentials());

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(string.IsNullOrEmpty(body.GetProperty("token").GetString()));
        Assert.True(body.GetProperty("expiresAt").GetDateTimeOffset() > DateTimeOffset.UtcNow.AddHours(7));
        var session = body.GetProperty("session");
        Assert.Equal("U01", session.GetProperty("userCode").GetString());
        Assert.Equal("ADMIN", session.GetProperty("userName").GetString());
        Assert.Equal("c-1", session.GetProperty("companyId").GetString());
        Assert.Equal("CMP", session.GetProperty("companyCode").GetString());
        Assert.Equal("Cargomar Pvt Ltd", session.GetProperty("companyName").GetString());
        Assert.Equal("b-1", session.GetProperty("branchId").GetString());
        Assert.Equal("Kochi", session.GetProperty("branchName").GetString());
        Assert.Equal("y-1", session.GetProperty("yearId").GetString());
        Assert.Equal("2025", session.GetProperty("yearCode").GetString());
        Assert.Equal("2025-2026", session.GetProperty("yearName").GetString());
        Assert.Equal("e-1", session.GetProperty("employeeId").GetString());
    }

    [Fact]
    public async Task The_issued_token_opens_the_protected_endpoints()
    {
        var (client, _) = ClientWith();
        var token = (await (await PostAsync(client, Credentials())).Content.ReadFromJsonAsync<JsonElement>())
            .GetProperty("token").GetString();
        client.DefaultRequestHeaders.Authorization = new("Bearer", token);

        var session = await client.GetFromJsonAsync<JsonElement>("/test-endpoints/session");

        Assert.Equal("b-1", session.GetProperty("branchId").GetString());
    }

    [Fact]
    public async Task Every_credential_failure_returns_the_same_401_problem()
    {
        var bodies = new List<string>();
        foreach (var (client, password) in new[]
                 {
                     (ClientWith(users: []).Client, Password),
                     (ClientWith().Client, "wrong"),
                     (ClientWith(company: false).Client, Password),
                 })
        {
            var body = await ProblemAsync(await PostAsync(client, Credentials(password)), HttpStatusCode.Unauthorized);
            Assert.Equal("Invalid user code, password or company code.", body.GetProperty("title").GetString());
            bodies.Add(string.Join(",", body.EnumerateObject().Select(p => p.Name)));
        }

        Assert.Single(bodies.Distinct());
    }

    [Fact]
    public async Task No_default_branch_returns_403_naming_it()
    {
        var body = await ProblemAsync(await PostAsync(ClientWith(branch: false).Client, Credentials()), HttpStatusCode.Forbidden);

        Assert.Equal("No default branch is set for this user.", body.GetProperty("title").GetString());
        Assert.False(body.TryGetProperty("token", out _));
    }

    [Fact]
    public async Task No_financial_year_returns_403_naming_it()
    {
        var body = await ProblemAsync(await PostAsync(ClientWith(year: false).Client, Credentials()), HttpStatusCode.Forbidden);

        Assert.Equal("No financial year is set up for this company.", body.GetProperty("title").GetString());
    }

    [Fact]
    public async Task Missing_fields_return_400_naming_each_and_check_nothing()
    {
        var (client, repository) = ClientWith();

        var body = await ProblemAsync(await PostAsync(client, new { userCode = "u01", password = "" }), HttpStatusCode.BadRequest);

        var errors = body.GetProperty("errors");
        Assert.Equal("Password is required.", errors.GetProperty("Password")[0].GetString());
        Assert.Equal("Company code is required.", errors.GetProperty("CompanyCode")[0].GetString());
        Assert.False(errors.TryGetProperty("UserCode", out _));
        await repository.DidNotReceiveWithAnyArgs().FindUsersAsync(default!, default!, default);
    }

    [Fact]
    public async Task A_too_long_user_code_returns_400()
    {
        var (client, _) = ClientWith();

        var body = await ProblemAsync(await PostAsync(client,
            new { userCode = new string('u', 16), password = Password, companyCode = "CMP" }), HttpStatusCode.BadRequest);

        Assert.True(body.GetProperty("errors").TryGetProperty("UserCode", out _));
    }

    [Theory]
    [InlineData("GET")]
    [InlineData("PUT")]
    [InlineData("PATCH")]
    [InlineData("DELETE")]
    public async Task Other_methods_return_405(string method)
    {
        var (client, repository) = ClientWith();

        var response = await client.SendAsync(new HttpRequestMessage(new HttpMethod(method), "/api/admin/login"));

        Assert.Equal(HttpStatusCode.MethodNotAllowed, response.StatusCode);
        await repository.DidNotReceiveWithAnyArgs().FindUsersAsync(default!, default!, default);
    }
}
