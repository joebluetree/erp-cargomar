using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;
using iErp.Entities;
using iErp.Reports.CompanyList;
using iErp.Tests.TestSupport;

namespace iErp.Tests.Integration;

/// <summary>GET /api/reports/companies through the real pipeline with a fake repository. No database needed.</summary>
public class CompaniesEndpointTests
{
    private static HttpClient ClientWith(ICompanyListRepository repository) =>
        new ApiFactory().WithWebHostBuilder(b => b.ConfigureServices(s =>
            s.AddScoped(_ => repository))).CreateClient().Authenticated();

    private static ICompanyListRepository RepositoryReturning(int total, params Company[] companies)
    {
        var repository = Substitute.For<ICompanyListRepository>();
        repository.ListCompaniesAsync(Arg.Any<CompanyListQuery>(), Arg.Any<CancellationToken>())
            .Returns((companies, total));
        return repository;
    }

    [Fact]
    public async Task Get_returns_200_with_camel_case_items_total_page_and_page_size()
    {
        var repository = RepositoryReturning(23, new Company { Id = "k1", Code = "A", Name = "Alpha", Address1 = "Road" });

        var response = await ClientWith(repository).GetAsync("/api/reports/companies");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(23, body.GetProperty("total").GetInt32());
        Assert.Equal(1, body.GetProperty("page").GetInt32());
        Assert.Equal(10, body.GetProperty("pageSize").GetInt32());
        var item = body.GetProperty("items").EnumerateArray().Single();
        Assert.Equal("k1", item.GetProperty("id").GetString());
        Assert.Equal("Alpha", item.GetProperty("name").GetString());
        Assert.Equal("Road", item.GetProperty("address1").GetString());
        Assert.Equal("", item.GetProperty("web").GetString());
    }

    [Fact]
    public async Task Get_without_parameters_asks_for_page_1_of_10_with_no_filters()
    {
        var repository = RepositoryReturning(0);

        await ClientWith(repository).GetAsync("/api/reports/companies");

        await repository.Received(1).ListCompaniesAsync(
            Arg.Is<CompanyListQuery>(q => q != null && q.Page == 1 && q.PageSize == 10 && q.Code == null && q.Name == null),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Get_passes_the_filters_and_paging_values_to_the_repository()
    {
        var repository = RepositoryReturning(0);

        var response = await ClientWith(repository).GetAsync("/api/reports/companies?code=ab&name=100%25&page=3&pageSize=25");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        await repository.Received(1).ListCompaniesAsync(
            Arg.Is<CompanyListQuery>(q => q != null && q.Code == "ab" && q.Name == "100%" && q.Page == 3 && q.PageSize == 25),
            Arg.Any<CancellationToken>());
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(3, body.GetProperty("page").GetInt32());
        Assert.Equal(25, body.GetProperty("pageSize").GetInt32());
    }

    [Fact]
    public async Task Get_with_no_matches_returns_an_empty_array_and_total_zero()
    {
        var response = await ClientWith(RepositoryReturning(0)).GetAsync("/api/reports/companies");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(0, body.GetProperty("items").GetArrayLength());
        Assert.Equal(0, body.GetProperty("total").GetInt32());
    }

    [Fact]
    public async Task A_page_after_the_last_returns_no_items_and_the_total()
    {
        var response = await ClientWith(RepositoryReturning(4)).GetAsync("/api/reports/companies?page=5");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(0, body.GetProperty("items").GetArrayLength());
        Assert.Equal(4, body.GetProperty("total").GetInt32());
    }

    [Theory]
    [InlineData("page=0", "Page")]
    [InlineData("page=-1", "Page")]
    [InlineData("pageSize=7", "PageSize")]
    [InlineData("pageSize=500", "PageSize")]
    [InlineData("pageSize=0", "PageSize")]
    public async Task Invalid_paging_values_return_400_naming_the_field_and_do_not_query(string query, string field)
    {
        var repository = RepositoryReturning(0);

        var response = await ClientWith(repository).GetAsync("/api/reports/companies?" + query);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(body.GetProperty("errors").TryGetProperty(field, out _), await response.Content.ReadAsStringAsync());
        await repository.DidNotReceiveWithAnyArgs().ListCompaniesAsync(default!, default);
    }

    [Fact]
    public async Task An_overlong_filter_returns_400_naming_the_filter()
    {
        var response = await ClientWith(RepositoryReturning(0)).GetAsync("/api/reports/companies?code=" + new string('a', 61));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(body.GetProperty("errors").TryGetProperty("Code", out _));
    }

    [Fact]
    public async Task A_non_numeric_page_returns_400()
    {
        var response = await ClientWith(RepositoryReturning(0)).GetAsync("/api/reports/companies?page=abc");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Theory]
    [InlineData("POST")]
    [InlineData("PUT")]
    [InlineData("PATCH")]
    [InlineData("DELETE")]
    public async Task Other_methods_return_405(string method)
    {
        var response = await ClientWith(Substitute.For<ICompanyListRepository>())
            .SendAsync(new HttpRequestMessage(new HttpMethod(method), "/api/reports/companies"));

        Assert.Equal(HttpStatusCode.MethodNotAllowed, response.StatusCode);
    }

    [Fact]
    public async Task Repository_failure_returns_500_problem_details_without_internals()
    {
        var repository = Substitute.For<ICompanyListRepository>();
        repository.ListCompaniesAsync(Arg.Any<CompanyListQuery>(), Arg.Any<CancellationToken>())
            .Returns<(IReadOnlyList<Company>, int)>(_ => throw new InvalidOperationException("ORA-secret-detail"));

        var response = await ClientWith(repository).GetAsync("/api/reports/companies");

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        var text = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("ORA-secret-detail", text);
        Assert.Contains("traceId", text);
    }
}
