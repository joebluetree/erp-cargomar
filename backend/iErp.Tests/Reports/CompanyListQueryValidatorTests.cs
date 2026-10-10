using iErp.Reports.CompanyList;

namespace iErp.Tests.Reports;

public class CompanyListQueryValidatorTests
{
    private static readonly CompanyListQueryValidator Validator = new();

    [Fact]
    public void Defaults_are_valid()
        => Assert.True(Validator.Validate(new CompanyListQuery()).IsValid);

    [Theory]
    [InlineData(2)]
    [InlineData(5)]
    [InlineData(10)]
    [InlineData(25)]
    [InlineData(50)]
    [InlineData(100)]
    public void The_allowed_page_sizes_are_valid(int pageSize)
        => Assert.True(Validator.Validate(new CompanyListQuery { PageSize = pageSize }).IsValid);

    [Theory]
    [InlineData(0)]
    [InlineData(1)]
    [InlineData(7)]
    [InlineData(101)]
    [InlineData(500)]
    [InlineData(-10)]
    public void Other_page_sizes_are_rejected_and_named(int pageSize)
    {
        var result = Validator.Validate(new CompanyListQuery { PageSize = pageSize });

        Assert.Equal(["PageSize"], result.Errors.Select(e => e.PropertyName));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-3)]
    public void A_page_below_one_is_rejected_and_named(int page)
    {
        var result = Validator.Validate(new CompanyListQuery { Page = page });

        Assert.Equal(["Page"], result.Errors.Select(e => e.PropertyName));
    }

    [Fact]
    public void Filters_up_to_sixty_characters_are_valid_and_longer_ones_are_rejected()
    {
        Assert.True(Validator.Validate(new CompanyListQuery { Code = new string('a', 60), Name = new string('b', 60) }).IsValid);

        var result = Validator.Validate(new CompanyListQuery { Code = new string('a', 61), Name = new string('b', 61) });

        Assert.Equal(["Code", "Name"], result.Errors.Select(e => e.PropertyName).Order());
    }

    [Fact]
    public void Blank_or_missing_filters_are_valid()
        => Assert.True(Validator.Validate(new CompanyListQuery { Code = "", Name = null }).IsValid);
}
