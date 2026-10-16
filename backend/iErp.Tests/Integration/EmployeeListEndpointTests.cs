using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;
using iErp.Admin.EmployeeList;
using iErp.Admin.EmployeeProfile;
using iErp.Entities;
using iErp.Tests.TestSupport;

namespace iErp.Tests.Integration;

/// <summary>
/// GET /api/admin/employees, /{id} and /{id}/photo through the real pipeline with fake repositories and a temporary
/// images folder. The test token's company is CMP and its branch b-1, whose code is KOC.
/// </summary>
public sealed class EmployeeListEndpointTests : IDisposable
{
    private static readonly EmployeeScope Scope = new("CMP", "KOC");
    private static readonly byte[] JpegBytes = [0xFF, 0xD8, 0xFF, 0xE0];
    private readonly string folder = Directory.CreateTempSubdirectory("ierp-emp-list-").FullName;

    public EmployeeListEndpointTests() => File.WriteAllBytes(Path.Combine(folder, "e9.jpg"), JpegBytes);

    public void Dispose() => Directory.Delete(folder, recursive: true);

    private (HttpClient Client, IEmployeeListRepository List, IEmployeeProfileRepository Profiles) ClientWith(bool authenticated = true)
    {
        var list = Substitute.For<IEmployeeListRepository>();
        list.ListAsync(Arg.Any<EmployeeListQuery>(), Arg.Any<EmployeeScope>(), Arg.Any<CancellationToken>()).Returns(
            ((IReadOnlyList<Employee>)[new Employee { Id = "e-9", Code = "1590", Name = "V S PRADEEP", DateOfBirth = new DateTime(1973, 9, 28), LocalAddress1 = "House 1", LocalAddress3 = "Area 3" }], 23));

        var profiles = Substitute.For<IEmployeeProfileRepository>();
        profiles.FindBranchCodeAsync("b-1", Arg.Any<CancellationToken>()).Returns("KOC");
        profiles.FindInScopeAsync("e-9", Scope, Arg.Any<CancellationToken>())
            .Returns(new Employee { Id = "e-9", Code = "1590", Name = "V S PRADEEP", Pan = "ABCDE1234F", ImageName = "e9.jpg" });
        profiles.ListPlacesAsync(Arg.Any<IReadOnlyCollection<string>>(), Arg.Any<CancellationToken>()).Returns([]);

        var client = new ApiFactory().WithWebHostBuilder(b => b.ConfigureServices(s =>
        {
            s.AddScoped(_ => list);
            s.AddScoped(_ => profiles);
            s.Configure<EmployeeImagesOptions>(o => o.Folder = folder);
        })).CreateClient();
        return (authenticated ? client.Authenticated() : client, list, profiles);
    }

    [Fact]
    public async Task The_list_returns_a_camel_case_page_for_the_session_scope()
    {
        var (client, list, _) = ClientWith();

        var body = await client.GetFromJsonAsync<JsonElement>("/api/admin/employees?name=pra&page=2&pageSize=5");

        Assert.Equal((23, 2, 5), (body.GetProperty("total").GetInt32(), body.GetProperty("page").GetInt32(), body.GetProperty("pageSize").GetInt32()));
        var row = body.GetProperty("items").EnumerateArray().Single();
        Assert.Equal(("e-9", "1590", "V S PRADEEP", "1973-09-28", "House 1, Area 3"),
            (row.GetProperty("id").GetString(), row.GetProperty("code").GetString(), row.GetProperty("name").GetString(),
             row.GetProperty("dateOfBirth").GetString(), row.GetProperty("address").GetString()));
        Assert.Equal(JsonValueKind.Null, row.GetProperty("email").ValueKind);
        await list.Received(1).ListAsync(Arg.Is<EmployeeListQuery>(q => q!.Name == "pra" && q.Page == 2 && q.PageSize == 5), Scope, Arg.Any<CancellationToken>());
    }

    [Theory]
    [InlineData("page=0", "Page")]
    [InlineData("pageSize=7", "PageSize")]
    public async Task Invalid_paging_values_answer_400_naming_the_field(string queryString, string field)
    {
        var (client, list, _) = ClientWith();

        var response = await client.GetAsync($"/api/admin/employees?{queryString}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(body.GetProperty("errors").TryGetProperty(field, out _));
        Assert.Empty(list.ReceivedCalls());
    }

    [Fact]
    public async Task A_listed_employee_has_a_full_profile_and_a_photo()
    {
        var (client, _, _) = ClientWith();

        var profile = await client.GetFromJsonAsync<JsonElement>("/api/admin/employees/e-9");
        var photo = await client.GetAsync("/api/admin/employees/e-9/photo");

        Assert.Equal("V S PRADEEP", profile.GetProperty("name").GetString());
        Assert.Equal("ABCDE1234F", profile.GetProperty("ids").GetProperty("pan").GetString());
        Assert.True(profile.GetProperty("hasPhoto").GetBoolean());
        Assert.Equal(HttpStatusCode.OK, photo.StatusCode);
        Assert.Equal("image/jpeg", photo.Content.Headers.ContentType?.MediaType);
        Assert.Equal(JpegBytes, await photo.Content.ReadAsByteArrayAsync());
        Assert.True(photo.Headers.CacheControl?.NoStore);
    }

    [Theory]
    [InlineData("/api/admin/employees/e-other")]
    [InlineData("/api/admin/employees/e-other/photo")]
    public async Task An_employee_outside_the_scope_answers_404(string url)
    {
        var (client, _, _) = ClientWith();

        var response = await client.GetAsync(url);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(EmployeesController.NotFoundMessage, body.GetProperty("title").GetString());
    }

    [Theory]
    [InlineData("/api/admin/employees")]
    [InlineData("/api/admin/employees/e-9")]
    [InlineData("/api/admin/employees/e-9/photo")]
    public async Task Every_endpoint_needs_a_token(string url)
    {
        var (client, list, profiles) = ClientWith(authenticated: false);

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync(url)).StatusCode);
        Assert.Empty(list.ReceivedCalls());
        Assert.Empty(profiles.ReceivedCalls());
    }
}
