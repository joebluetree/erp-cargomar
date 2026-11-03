using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;
using iErp.Admin.HolidayList;
using iErp.Admin.UserRights;
using iErp.Entities;
using iErp.Shared.Auth;
using iErp.SharedBusiness.Holidays;
using iErp.Tests.TestSupport;

namespace iErp.Tests.Integration;

/// <summary>
/// POST /api/admin/holidays/file through the real pipeline with a fake repository and a temporary holiday folder, never
/// the configured one. The test token's company is CMP (c-1), its branch b-1 (code KOC) and its year y-1 (code 2026).
/// </summary>
public sealed class HolidayUploadEndpointTests : IDisposable
{
    private readonly string folder = Directory.CreateTempSubdirectory("ierp-holiday-upload-api-").FullName;
    private static readonly byte[] List = Encoding.UTF8.GetBytes("Republic Day,Monday,26-01-2026\r\n");

    public void Dispose() => Directory.Delete(folder, recursive: true);

    /// <summary>A client whose rights come from <paramref name="access"/>, or from the real check with no rights rows.</summary>
    private HttpClient ClientWith(IMenuAccess? access, string userCode = "U01")
    {
        var repository = Substitute.For<IHolidayListRepository>();
        repository.FindBranchAsync("b-1", Arg.Any<CancellationToken>()).Returns(new Company { Id = "b-1", Type = "B", Code = "KOC", Name = "Kochi" });
        repository.FindYearCodeAsync("y-1", Arg.Any<CancellationToken>()).Returns(2026m);
        repository.FindCompanyBranchByCodeAsync("c-1", "KOC", Arg.Any<CancellationToken>()).Returns(new Company { Id = "b-1", Code = "KOC" });
        repository.FindCompanyYearByCodeAsync("CMP", 2026m, Arg.Any<CancellationToken>()).Returns(new FinancialYear { Id = "y-1", Code = 2026 });
        var menus = Substitute.For<IMenuRepository>();

        return new ApiFactory().WithWebHostBuilder(b => b.ConfigureServices(s =>
        {
            s.AddScoped(_ => repository);
            s.Configure<HolidayListsOptions>(o => o.Folder = folder);
            if (access is null)
            {
                s.AddScoped(_ => menus);
                s.AddScoped<IMenuAccess, MenuAccess>();
            }
            else
            {
                s.AddScoped(_ => access);
            }
        })).CreateClient().Authenticated(TestTokens.Create(userCode: userCode));
    }

    private static FakeMenuAccess HolidayAdmin()
    {
        var access = new FakeMenuAccess();
        access.AdminOf.Add(MenuCodes.HolidayList);
        return access;
    }

    private static MultipartFormDataContent Form(string? fileName = "CMP-KOC-2026.txt", byte[]? content = null, bool? replace = null)
    {
        var form = new MultipartFormDataContent();
        if (fileName is not null)
        {
            var file = new ByteArrayContent(content ?? List);
            file.Headers.ContentType = new MediaTypeHeaderValue("text/plain");
            form.Add(file, "file", fileName);
        }
        if (replace is not null)
            form.Add(new StringContent(replace.Value ? "true" : "false"), "replace");
        return form;
    }

    private static async Task<string?> Title(HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("title").GetString();

    private string[] Files() => Directory.GetFiles(folder).Select(Path.GetFileName).ToArray()!;

    [Fact]
    public async Task The_admin_user_with_no_rights_rows_saves_a_file_and_the_list_reads_it_at_once()
    {
        var client = ClientWith(access: null, userCode: "ADMIN");

        var response = await client.PostAsync("/api/admin/holidays/file", Form());

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("CMP-KOC-2026.txt", (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("fileName").GetString());
        Assert.Equal(List, File.ReadAllBytes(Path.Combine(folder, "CMP-KOC-2026.txt")));

        var list = await client.GetFromJsonAsync<JsonElement>("/api/admin/holidays");
        Assert.Equal("Republic Day", list.GetProperty("items")[0].GetProperty("holiday").GetString());
    }

    [Fact]
    public async Task A_user_with_the_Holiday_List_admin_right_saves_a_file()
    {
        var response = await ClientWith(HolidayAdmin()).PostAsync("/api/admin/holidays/file", Form());

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(["CMP-KOC-2026.txt"], Files());
    }

    [Fact]
    public async Task A_view_only_user_is_refused_and_nothing_is_written()
    {
        var response = await ClientWith(new FakeMenuAccess()).PostAsync("/api/admin/holidays/file", Form());

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal(HolidaysController.NoUploadRightMessage, await Title(response));
        Assert.Empty(Files());
    }

    [Fact]
    public async Task A_user_without_the_view_right_is_refused_by_the_screen_check()
    {
        var access = new FakeMenuAccess(allow: false);
        access.AdminOf.Add(MenuCodes.HolidayList);

        var response = await ClientWith(access).PostAsync("/api/admin/holidays/file", Form());

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal(MenuAccessFilter.NoAccessMessage, await Title(response));
        Assert.Empty(Files());
    }

    [Fact]
    public async Task No_file_answers_400()
    {
        var response = await ClientWith(HolidayAdmin()).PostAsync("/api/admin/holidays/file", Form(fileName: null, replace: false));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(HolidayUploadService.NoFileMessage, await Title(response));
    }

    [Fact]
    public async Task A_bad_name_answers_400_with_the_naming_message()
    {
        var response = await ClientWith(HolidayAdmin()).PostAsync("/api/admin/holidays/file", Form(fileName: "XYZ-KOC-2026.txt"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(HolidayUploadService.NameMessage, await Title(response));
        Assert.Empty(Files());
    }

    [Fact]
    public async Task An_existing_file_answers_409_then_is_replaced_when_asked()
    {
        var path = Path.Combine(folder, "CMP-KOC-2026.txt");
        File.WriteAllText(path, "Old,01-01-2026");
        var client = ClientWith(HolidayAdmin());

        var refused = await client.PostAsync("/api/admin/holidays/file", Form());

        Assert.Equal(HttpStatusCode.Conflict, refused.StatusCode);
        Assert.Equal("A holiday list named CMP-KOC-2026.txt already exists.", await Title(refused));
        Assert.Equal("Old,01-01-2026", File.ReadAllText(path));

        var replaced = await client.PostAsync("/api/admin/holidays/file", Form(replace: true));

        Assert.Equal(HttpStatusCode.OK, replaced.StatusCode);
        Assert.Equal(List, File.ReadAllBytes(path));
    }

    [Fact]
    public async Task Needs_a_token()
    {
        var client = new ApiFactory().CreateClient();

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsync("/api/admin/holidays/file", Form())).StatusCode);
    }
}
