using NSubstitute;
using iErp.Entities;
using iErp.Reports.CompanyList;

namespace iErp.Tests.Reports;

public class CompanyListServiceTests
{
    private static (CompanyListService Service, ICompanyListRepository Repository) ServiceFor(int total, params Company[] companies)
    {
        var repository = Substitute.For<ICompanyListRepository>();
        repository.ListCompaniesAsync(Arg.Any<CompanyListQuery>(), Arg.Any<CancellationToken>())
            .Returns((companies, total));
        return (new CompanyListService(repository), repository);
    }

    [Fact]
    public async Task Maps_every_field_keeps_the_repository_order_and_reports_the_page()
    {
        var (service, _) = ServiceFor(23,
            new Company { Id = "k1", Code = "A", Name = "Alpha", Address1 = "a1", Address2 = "a2", Address3 = "a3", Tel = "t", Email = "e", Web = "w" },
            new Company { Id = "k2", Code = "B", Name = "Beta" });

        var result = await service.ListAsync(new CompanyListQuery { Page = 3, PageSize = 25 });

        Assert.Equal(["k1", "k2"], result.Items.Select(i => i.Id));
        Assert.Equal(new CompanyListItemDto("k1", "A", "Alpha", "a1", "a2", "a3", "t", "e", "w"), result.Items[0]);
        Assert.Equal(23, result.Total);
        Assert.Equal(3, result.Page);
        Assert.Equal(25, result.PageSize);
    }

    [Fact]
    public async Task Missing_optional_values_become_empty_strings()
    {
        var (service, _) = ServiceFor(1, new Company { Id = "k1" });

        var result = await service.ListAsync(new CompanyListQuery());

        Assert.Equal(new CompanyListItemDto("k1", "", "", "", "", "", "", "", ""), result.Items.Single());
    }

    [Fact]
    public async Task No_companies_gives_an_empty_page_with_the_total()
    {
        var (service, _) = ServiceFor(4);

        var result = await service.ListAsync(new CompanyListQuery { Page = 9 });

        Assert.Empty(result.Items);
        Assert.Equal(4, result.Total);
    }

    [Fact]
    public async Task Passes_the_query_to_the_repository_unchanged()
    {
        var (service, repository) = ServiceFor(0);
        var query = new CompanyListQuery { Code = "ab", Name = "trad", Page = 2, PageSize = 5 };

        await service.ListAsync(query);

        await repository.Received(1).ListCompaniesAsync(query, Arg.Any<CancellationToken>());
    }
}
