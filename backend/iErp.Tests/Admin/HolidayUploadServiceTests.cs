using System.Text;
using Microsoft.Extensions.Options;
using NSubstitute;
using iErp.Admin.HolidayList;
using iErp.Entities;
using iErp.Shared.Auth;
using iErp.SharedBusiness.Holidays;

namespace iErp.Tests.Admin;

/// <summary>The holiday file upload (admin-list-upload design D4) on a temporary folder, never the configured one.</summary>
public sealed class HolidayUploadServiceTests : IDisposable
{
    private readonly string folder = Directory.CreateTempSubdirectory("ierp-holiday-upload-").FullName;
    private readonly IHolidayListRepository repository = Substitute.For<IHolidayListRepository>();
    private static readonly byte[] List = Encoding.UTF8.GetBytes("Republic Day,Monday,26-01-2026\r\nOnam,Wednesday,26-08-2026\r\n");

    public HolidayUploadServiceTests()
    {
        // Company CPL (c-1) has the branches COKSF and MAASF and the years 2025 (closed) and 2026.
        repository.FindCompanyBranchByCodeAsync("c-1", Arg.Is<string>(c => c!.ToUpperInvariant() == "COKSF"), Arg.Any<CancellationToken>())
            .Returns(new Company { Id = "b-1", Code = "COKSF " });
        repository.FindCompanyBranchByCodeAsync("c-1", Arg.Is<string>(c => c!.ToUpperInvariant() == "MAASF"), Arg.Any<CancellationToken>())
            .Returns(new Company { Id = "b-2", Code = "MAASF" });
        repository.FindCompanyYearByCodeAsync("CPL", 2026m, Arg.Any<CancellationToken>()).Returns(new FinancialYear { Id = "y-2", Code = 2026 });
        repository.FindCompanyYearByCodeAsync("CPL", 2025m, Arg.Any<CancellationToken>())
            .Returns(new FinancialYear { Id = "y-1", Code = 2025, Closed = "Y" });
    }

    public void Dispose() => Directory.Delete(folder, recursive: true);

    private HolidayUploadService Service()
    {
        var session = Substitute.For<ICurrentSession>();
        session.CompanyCode.Returns(" CPL ");
        session.CompanyId.Returns("c-1");
        var options = Substitute.For<IOptionsMonitor<HolidayListsOptions>>();
        options.CurrentValue.Returns(new HolidayListsOptions { Folder = folder });
        return new HolidayUploadService(repository, new HolidayFileStore(options), session);
    }

    private string[] Files() => Directory.GetFiles(folder).Select(Path.GetFileName).ToArray()!;

    [Fact]
    public async Task A_valid_file_is_saved_under_its_name_byte_for_byte()
    {
        var result = await Service().UploadAsync("CPL-COKSF-2026.txt", List, replace: false);

        Assert.Equal(new HolidayUploadResult(HolidayUploadOutcome.Saved, "CPL-COKSF-2026.txt"), result);
        Assert.Equal(List, File.ReadAllBytes(Path.Combine(folder, "CPL-COKSF-2026.txt")));
    }

    [Fact]
    public async Task Another_branch_and_a_closed_year_of_the_company_are_allowed()
    {
        var result = await Service().UploadAsync("CPL-MAASF-2025.txt", List, replace: false);

        Assert.Equal(HolidayUploadOutcome.Saved, result.Outcome);
        Assert.Equal(["CPL-MAASF-2025.txt"], Files());
    }

    [Fact]
    public async Task The_name_is_saved_with_the_database_s_codes()
    {
        var result = await Service().UploadAsync("cpl-coksf-2026.TXT", List, replace: false);

        Assert.Equal("CPL-COKSF-2026.txt", result.FileName);
        Assert.Equal(["CPL-COKSF-2026.txt"], Files());
    }

    public static TheoryData<string, string?, byte[]?> Refusals => new()
    {
        { "no file", null, null },
        { "no name", "", List },
        { "empty", "CPL-COKSF-2026.txt", [] },
        { "too large", "CPL-COKSF-2026.txt", new byte[HolidayUploadService.MaxBytes + 1] },
        { "not UTF-8", "CPL-COKSF-2026.txt", [0x48, 0x6F, 0xFF, 0xFE, 0x6C] },
        { "another company", "XYZ-COKSF-2026.txt", List },
        { "unknown branch", "CPL-BOMSF-2026.txt", List },
        { "unknown year", "CPL-COKSF-2019.txt", List },
        { "not .txt", "CPL-COKSF-2026.csv", List },
        { "folder in the name", @"..\CPL-COKSF-2026.txt", List },
    };

    [Theory]
    [MemberData(nameof(Refusals))]
    public async Task A_file_breaking_a_rule_is_refused_with_its_message_and_nothing_is_written(string reason, string? name, byte[]? content)
    {
        var result = await Service().UploadAsync(name, content, replace: true);

        Assert.True(result.Outcome == HolidayUploadOutcome.Invalid, reason);
        var expected = reason switch
        {
            "no file" or "no name" => HolidayUploadService.NoFileMessage,
            "empty" => HolidayUploadService.EmptyMessage,
            "too large" => HolidayUploadService.TooLargeMessage,
            "not UTF-8" => HolidayUploadService.NotTextMessage,
            _ => HolidayUploadService.NameMessage,
        };
        Assert.Equal(expected, result.Message);
        Assert.Empty(Files());
    }

    [Fact]
    public async Task A_file_at_the_size_limit_with_a_byte_order_mark_is_accepted()
    {
        byte[] content = [0xEF, 0xBB, 0xBF, .. Enumerable.Repeat((byte)'a', HolidayUploadService.MaxBytes - 3)];

        Assert.Equal(HolidayUploadOutcome.Saved, (await Service().UploadAsync("CPL-COKSF-2026.txt", content, replace: false)).Outcome);
    }

    [Fact]
    public async Task An_existing_file_is_kept_unless_replacing_is_asked_for()
    {
        var path = Path.Combine(folder, "CPL-COKSF-2026.txt");
        File.WriteAllText(path, "Old,01-01-2026");

        var refused = await Service().UploadAsync("CPL-COKSF-2026.txt", List, replace: false);

        Assert.Equal(HolidayUploadOutcome.Exists, refused.Outcome);
        Assert.Equal("A holiday list named CPL-COKSF-2026.txt already exists.", refused.Message);
        Assert.Equal("Old,01-01-2026", File.ReadAllText(path));

        var replaced = await Service().UploadAsync("CPL-COKSF-2026.txt", List, replace: true);

        Assert.Equal(HolidayUploadOutcome.Saved, replaced.Outcome);
        Assert.Equal(List, File.ReadAllBytes(path));
    }
}
