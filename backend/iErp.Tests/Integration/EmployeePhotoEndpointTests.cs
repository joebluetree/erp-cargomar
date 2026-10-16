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
/// GET /api/admin/profile/photo and the profile's <c>hasPhoto</c> through the real pipeline, with a fake repository and
/// a temporary images folder set as <c>EmployeeImages:Folder</c>.
/// </summary>
public sealed class EmployeePhotoEndpointTests : IDisposable
{
    private static readonly byte[] JpegBytes = [0xFF, 0xD8, 0xFF, 0xE0, 0x01, 0x02];
    private readonly string folder = Directory.CreateTempSubdirectory("ierp-photo-endpoint-").FullName;

    public EmployeePhotoEndpointTests()
    {
        File.WriteAllBytes(Path.Combine(folder, "1590.jpg"), JpegBytes);
    }

    public void Dispose() => Directory.Delete(folder, recursive: true);

    private (HttpClient Client, IEmployeeProfileRepository Repository) ClientWith(string? token)
    {
        var repository = Substitute.For<IEmployeeProfileRepository>();
        repository.FindEmployeeAsync("e-1", Arg.Any<CancellationToken>())
            .Returns(new Employee { Id = "e-1", Name = "Asha Nair", ImageName = "1590.jpg" });
        repository.FindEmployeeAsync("e-2", Arg.Any<CancellationToken>())
            .Returns(new Employee { Id = "e-2", Name = "No Photo" });
        repository.FindEmployeeAsync("e-3", Arg.Any<CancellationToken>())
            .Returns(new Employee { Id = "e-3", Name = "Missing File", ImageName = "missing.jpg" });
        repository.ListPlacesAsync(Arg.Any<IReadOnlyCollection<string>>(), Arg.Any<CancellationToken>()).Returns([]);

        var client = new ApiFactory().WithWebHostBuilder(b => b.ConfigureServices(s =>
        {
            s.AddScoped(_ => repository);
            s.Configure<EmployeeImagesOptions>(o => o.Folder = folder);
        })).CreateClient();
        return (token is null ? client : client.Authenticated(token), repository);
    }

    [Fact]
    public async Task Returns_the_own_photo_as_a_jpeg_that_is_never_cached()
    {
        var (client, _) = ClientWith(TestTokens.Create(employeeId: "e-1"));

        var response = await client.GetAsync("/api/admin/profile/photo");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("image/jpeg", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal(JpegBytes, await response.Content.ReadAsByteArrayAsync());
        Assert.True(response.Headers.CacheControl?.NoStore);
    }

    [Fact]
    public async Task A_file_replaced_in_the_folder_is_served_at_once()
    {
        var (client, _) = ClientWith(TestTokens.Create(employeeId: "e-1"));
        Assert.Equal(JpegBytes, await (await client.GetAsync("/api/admin/profile/photo")).Content.ReadAsByteArrayAsync());

        byte[] replaced = [0xFF, 0xD8, 0xFF, 0xE1, 0x09];
        File.WriteAllBytes(Path.Combine(folder, "1590.jpg"), replaced);

        Assert.Equal(replaced, await (await client.GetAsync("/api/admin/profile/photo")).Content.ReadAsByteArrayAsync());
    }

    [Theory]
    [InlineData("e-1", true)]
    [InlineData("e-2", false)]
    [InlineData("e-3", false)]
    public async Task The_profile_says_whether_a_photo_is_available(string employeeId, bool hasPhoto)
    {
        var (client, _) = ClientWith(TestTokens.Create(employeeId: employeeId));

        var body = await client.GetFromJsonAsync<JsonElement>("/api/admin/profile");

        Assert.Equal(hasPhoto, body.GetProperty("hasPhoto").GetBoolean());
    }

    [Theory]
    [InlineData("e-2")] // no image name
    [InlineData("e-3")] // the file is not in the folder
    [InlineData("e-missing")] // no employee
    public async Task Answers_404_when_there_is_no_photo(string employeeId)
    {
        var (client, _) = ClientWith(TestTokens.Create(employeeId: employeeId));

        var response = await client.GetAsync("/api/admin/profile/photo");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Ignores_a_file_name_in_the_request()
    {
        var (client, repository) = ClientWith(TestTokens.Create(employeeId: "e-2"));

        var response = await client.GetAsync("/api/admin/profile/photo?name=1590.jpg");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        await repository.Received().FindEmployeeAsync("e-2", Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Needs_a_token()
    {
        var (client, repository) = ClientWith(token: null);

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/admin/profile/photo")).StatusCode);
        Assert.Empty(repository.ReceivedCalls());
    }
}
