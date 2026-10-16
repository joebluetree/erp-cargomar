using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;
using iErp.Admin.EmployeeProfile;
using iErp.Entities;
using iErp.Tests.TestSupport;

namespace iErp.Tests.Integration;

/// <summary>
/// GET /api/admin/profile through the real pipeline with a fake repository. No database needed; the repository has
/// no write methods, so nothing can be written.
/// </summary>
public class EmployeeProfileEndpointTests
{
    private static (HttpClient Client, IEmployeeProfileRepository Repository) ClientWith(string? token)
    {
        var repository = Substitute.For<IEmployeeProfileRepository>();
        repository.FindEmployeeAsync("e-1", Arg.Any<CancellationToken>()).Returns(new Employee
        {
            Id = "e-1", Code = "EMP01", Name = "Asha Nair", DateOfBirth = new DateTime(1990, 3, 5),
            BankName = "SBI", LocalCity = "Kochi", LocalStateId = "s-kl", LocalCountryId = "c-in", HomeCity = "Chennai",
            Pan = "ABCDE1234F",
        });
        repository.FindEmployeeAsync("e-2", Arg.Any<CancellationToken>()).Returns(new Employee { Id = "e-2", Name = "Other" });
        repository.ListPlacesAsync(Arg.Any<IReadOnlyCollection<string>>(), Arg.Any<CancellationToken>()).Returns(
        [
            new Parameter { Id = "s-kl", Type = "STATE", Name = "KERALA" },
            new Parameter { Id = "c-in", Type = "COUNTRY", Name = "INDIA" },
        ]);

        var client = new ApiFactory().WithWebHostBuilder(b => b.ConfigureServices(s => s.AddScoped(_ => repository)))
            .CreateClient();
        return (token is null ? client : client.Authenticated(token), repository);
    }

    private static async Task AssertNotLinkedAsync(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(404, body.GetProperty("status").GetInt32());
        Assert.Equal(EmployeeProfileController.NotLinkedMessage, body.GetProperty("title").GetString());
    }

    [Fact]
    public async Task Returns_the_session_employee_profile_in_camel_case()
    {
        var (client, _) = ClientWith(TestTokens.Create(employeeId: "e-1"));

        var response = await client.GetAsync("/api/admin/profile");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(("EMP01", "Asha Nair"), (body.GetProperty("code").GetString(), body.GetProperty("name").GetString()));
        Assert.Equal("1990-03-05", body.GetProperty("dateOfBirth").GetString());
        Assert.Equal("SBI", body.GetProperty("bank").GetProperty("name").GetString());
        var current = body.GetProperty("currentAddress");
        Assert.Equal(("Kochi", "KERALA", "INDIA"),
            (current.GetProperty("city").GetString(), current.GetProperty("state").GetString(), current.GetProperty("country").GetString()));
        Assert.Equal("Chennai", body.GetProperty("permanentAddress").GetProperty("city").GetString());
        Assert.Equal(JsonValueKind.Null, body.GetProperty("spouseName").ValueKind);
        Assert.Equal("ABCDE1234F", body.GetProperty("ids").GetProperty("pan").GetString());
    }

    [Fact]
    public async Task An_id_in_the_request_is_ignored()
    {
        var (client, repository) = ClientWith(TestTokens.Create(employeeId: "e-1"));

        var body = await client.GetFromJsonAsync<JsonElement>("/api/admin/profile?id=e-2");

        Assert.Equal("Asha Nair", body.GetProperty("name").GetString());
        await repository.DidNotReceive().FindEmployeeAsync("e-2", Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task A_token_without_an_employee_id_gets_404()
    {
        var (client, repository) = ClientWith(TestTokens.Create());

        await AssertNotLinkedAsync(await client.GetAsync("/api/admin/profile"));
        Assert.Empty(repository.ReceivedCalls());
    }

    [Fact]
    public async Task An_employee_id_without_an_employee_gets_404()
    {
        var (client, _) = ClientWith(TestTokens.Create(employeeId: "e-missing"));

        await AssertNotLinkedAsync(await client.GetAsync("/api/admin/profile"));
    }

    [Fact]
    public async Task No_token_gets_401_and_reads_nothing()
    {
        var (client, repository) = ClientWith(token: null);

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/admin/profile")).StatusCode);
        Assert.Empty(repository.ReceivedCalls());
    }
}
