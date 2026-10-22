using FluentValidation.TestHelper;
using NSubstitute;
using iErp.Entities;
using iErp.Reports.BranchList;
using iErp.Shared.Auth;
using iErp.SharedBusiness.Holidays;

namespace iErp.Tests.Reports;

public class BranchListServiceTests
{
    private static readonly Company Blraf = new() { Id = "b-2", Type = "B", ParentId = "c-1", Code = " BLRAF ", Name = " Bangalore Air " };

    private static ICurrentSession Session(string? companyId = "c-1", string? yearId = "y-1")
    {
        var session = Substitute.For<ICurrentSession>();
        session.CompanyId.Returns(companyId);
        session.CompanyCode.Returns("CPL");
        session.YearId.Returns(yearId);
        return session;
    }

    private static (BranchListService Service, IBranchListRepository Repository, IHolidayFileStore Files) ServiceWith(
        ICurrentSession session, decimal? yearCode = 2026m, IReadOnlyList<string>? lines = null, params Company[] branches)
    {
        var repository = Substitute.For<IBranchListRepository>();
        repository.ListAsync(Arg.Any<BranchListQuery>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(((IReadOnlyList<Company>)branches, 16));
        repository.FindListedAsync("b-2", "c-1", Arg.Any<CancellationToken>()).Returns(Blraf);
        repository.FindYearCodeAsync("y-1", Arg.Any<CancellationToken>()).Returns(yearCode);
        var files = Substitute.For<IHolidayFileStore>();
        files.Read(Arg.Any<string>()).Returns(lines);
        return (new BranchListService(repository, files, session), repository, files);
    }

    [Fact]
    public async Task Lists_the_session_company_s_branches_with_empty_strings_for_missing_values()
    {
        var (service, repository, _) = ServiceWith(Session(), branches: new Company { Id = "b-1", Code = "COKSF", Name = "Kochi", Tel = "0484" });
        var query = new BranchListQuery { Code = "cok", Page = 2, PageSize = 5 };

        var page = await service.ListAsync(query);

        Assert.Equal((16, 2, 5), (page.Total, page.Page, page.PageSize));
        Assert.Equal(new BranchListItemDto("b-1", "COKSF", "Kochi", "", "", "", "0484", "", ""), Assert.Single(page.Items));
        await repository.Received(1).ListAsync(query, "c-1", Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Without_a_company_the_page_is_empty_and_nothing_is_read()
    {
        var (service, repository, _) = ServiceWith(Session(companyId: null));

        var page = await service.ListAsync(new BranchListQuery { Page = 3, PageSize = 10 });

        Assert.Equal((0, 3, 10), (page.Total, page.Page, page.PageSize));
        Assert.Empty(page.Items);
        Assert.Empty(repository.ReceivedCalls());
    }

    [Fact]
    public async Task A_listed_branch_s_holidays_come_from_its_file_for_the_session_year()
    {
        var (service, _, files) = ServiceWith(Session(), lines: ["Holiday,Day,Date", "Republic Day,Monday,26-January-2026"]);

        var list = await service.GetHolidaysAsync("b-2");

        files.Received(1).Read("CPL-BLRAF-2026.txt");
        Assert.Equal(("BLRAF", "Bangalore Air"), (list!.BranchCode, list.BranchName));
        Assert.Equal([new HolidayDto("Republic Day", "Monday", "26-January-2026")], list.Items);
    }

    [Fact]
    public async Task A_branch_that_is_not_listed_gives_nothing_and_reads_no_file()
    {
        var (service, _, files) = ServiceWith(Session(), lines: ["A, 1"]);

        Assert.Null(await service.GetHolidaysAsync("b-other"));
        Assert.Empty(files.ReceivedCalls());
    }

    [Theory]
    [InlineData(null, "y-1")]
    [InlineData("c-1", null)]
    public async Task Without_a_company_or_a_year_nothing_is_read(string? companyId, string? yearId)
    {
        var (service, repository, files) = ServiceWith(Session(companyId, yearId), lines: ["A, 1"]);

        Assert.Null(await service.GetHolidaysAsync("b-2"));
        Assert.Empty(repository.ReceivedCalls());
        Assert.Empty(files.ReceivedCalls());
    }

    [Fact]
    public async Task Without_a_year_code_or_a_file_there_is_no_list()
    {
        Assert.Null(await ServiceWith(Session(), yearCode: null, lines: ["A, 1"]).Service.GetHolidaysAsync("b-2"));
        Assert.Null(await ServiceWith(Session(), lines: null).Service.GetHolidaysAsync("b-2"));
    }
}

public class BranchListQueryValidatorTests
{
    private readonly BranchListQueryValidator validator = new();

    [Fact]
    public void Defaults_are_valid()
    {
        validator.TestValidate(new BranchListQuery()).ShouldNotHaveAnyValidationErrors();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Page_must_be_1_or_more(int page)
    {
        validator.TestValidate(new BranchListQuery { Page = page }).ShouldHaveValidationErrorFor(q => q.Page);
    }

    [Fact]
    public void Page_size_must_be_one_of_the_common_sizes()
    {
        validator.TestValidate(new BranchListQuery { PageSize = 7 }).ShouldHaveValidationErrorFor(q => q.PageSize);
        validator.TestValidate(new BranchListQuery { PageSize = 25 }).ShouldNotHaveValidationErrorFor(q => q.PageSize);
    }

    [Fact]
    public void Filters_are_at_most_60_characters()
    {
        var tooLong = new string('x', BranchListQuery.MaxFilterLength + 1);

        validator.TestValidate(new BranchListQuery { Code = tooLong }).ShouldHaveValidationErrorFor(q => q.Code);
        validator.TestValidate(new BranchListQuery { Name = tooLong }).ShouldHaveValidationErrorFor(q => q.Name);
    }
}
