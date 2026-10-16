using iErp.Admin.EmployeeList;

namespace iErp.Tests.Admin;

public class EmployeeListQueryValidatorTests
{
    private static readonly EmployeeListQueryValidator Validator = new();

    [Fact]
    public void Defaults_are_valid()
        => Assert.True(Validator.Validate(new EmployeeListQuery()).IsValid);

    [Theory]
    [InlineData(2)]
    [InlineData(5)]
    [InlineData(10)]
    [InlineData(25)]
    [InlineData(50)]
    [InlineData(100)]
    public void The_allowed_page_sizes_are_valid(int pageSize)
        => Assert.True(Validator.Validate(new EmployeeListQuery { PageSize = pageSize }).IsValid);

    [Theory]
    [InlineData(0)]
    [InlineData(7)]
    [InlineData(101)]
    public void Other_page_sizes_are_rejected_and_named(int pageSize)
        => Assert.Equal(["PageSize"], Validator.Validate(new EmployeeListQuery { PageSize = pageSize }).Errors.Select(e => e.PropertyName));

    [Theory]
    [InlineData(0)]
    [InlineData(-3)]
    public void A_page_below_one_is_rejected_and_named(int page)
        => Assert.Equal(["Page"], Validator.Validate(new EmployeeListQuery { Page = page }).Errors.Select(e => e.PropertyName));

    [Fact]
    public void Filters_longer_than_60_characters_are_rejected_and_named()
    {
        var result = Validator.Validate(new EmployeeListQuery { Code = new string('c', 61), Name = new string('n', 61) });

        Assert.Equal(["Code", "Name"], result.Errors.Select(e => e.PropertyName));
        Assert.True(Validator.Validate(new EmployeeListQuery { Code = new string('c', 60), Name = new string('n', 60) }).IsValid);
    }
}
