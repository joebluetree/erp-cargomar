using NSubstitute;
using iErp.Entities;
using iErp.Admin.HolidayList;
using iErp.SharedBusiness.Holidays;
using iErp.Shared.Auth;

namespace iErp.Tests.Admin;

public class HolidayListServiceTests
{
    private static ICurrentSession Session(string? companyCode = " CPL ", string? branchId = "b-1", string? yearId = "y-1")
    {
        var session = Substitute.For<ICurrentSession>();
        session.CompanyCode.Returns(companyCode);
        session.BranchId.Returns(branchId);
        session.YearId.Returns(yearId);
        return session;
    }

    private static (HolidayListService Service, IHolidayFileStore Files) ServiceWith(
        ICurrentSession session, string? branchCode = " COKSF ", decimal? yearCode = 2026m, IReadOnlyList<string>? lines = null)
    {
        var repository = Substitute.For<IHolidayListRepository>();
        repository.FindBranchAsync("b-1", Arg.Any<CancellationToken>())
            .Returns(branchCode is null ? null : new Company { Id = "b-1", Type = "B", Code = branchCode, Name = " Kochi Sea " });
        repository.FindYearCodeAsync("y-1", Arg.Any<CancellationToken>()).Returns(yearCode);
        var files = Substitute.For<IHolidayFileStore>();
        files.Read(Arg.Any<string>()).Returns(lines);
        return (new HolidayListService(repository, files, session), files);
    }

    [Fact]
    public async Task Reads_the_file_named_by_the_company_branch_and_year_codes_with_the_branch()
    {
        var (service, files) = ServiceWith(Session(), lines: ["Holiday,Day,Date", "Republic Day,Monday,26-01-2026", "Vishu,Thursday,14-May-2026"]);

        var list = await service.GetAsync();

        files.Received(1).Read("CPL-COKSF-2026.txt");
        Assert.Equal(("COKSF", "Kochi Sea"), (list!.BranchCode, list.BranchName));
        Assert.Equal([new HolidayDto("Republic Day", "Monday", "26-01-2026"), new HolidayDto("Vishu", "Thursday", "14-May-2026")], list.Items);
    }

    [Fact]
    public async Task The_year_code_is_a_whole_number()
    {
        var (service, files) = ServiceWith(Session(), yearCode: 2026.0m, lines: []);

        await service.GetAsync();

        files.Received(1).Read("CPL-COKSF-2026.txt");
    }

    [Fact]
    public async Task An_empty_file_gives_no_holidays()
    {
        var (service, _) = ServiceWith(Session(), lines: []);

        Assert.Empty((await service.GetAsync())!.Items);
    }

    [Fact]
    public async Task A_missing_file_gives_nothing()
    {
        var (service, _) = ServiceWith(Session(), lines: null);

        Assert.Null(await service.GetAsync());
    }

    public static TheoryData<string?, string?, string?, string?, decimal?> MissingValues => new()
    {
        { null, "b-1", "y-1", "COKSF", 2026m },
        { "CPL", null, "y-1", "COKSF", 2026m },
        { "CPL", "b-1", null, "COKSF", 2026m },
        { " ", "b-1", "y-1", "COKSF", 2026m },
        { "CPL", "b-1", "y-1", null, 2026m },
        { "CPL", "b-1", "y-1", "  ", 2026m },
        { "CPL", "b-1", "y-1", "COKSF", null },
    };

    [Theory]
    [MemberData(nameof(MissingValues))]
    public async Task Without_a_company_branch_year_or_their_codes_nothing_is_read(
        string? companyCode, string? branchId, string? yearId, string? branchCode, decimal? yearCode)
    {
        var (service, files) = ServiceWith(Session(companyCode, branchId, yearId), branchCode, yearCode, ["A, 1"]);

        Assert.Null(await service.GetAsync());
        Assert.Empty(files.ReceivedCalls());
    }
}
