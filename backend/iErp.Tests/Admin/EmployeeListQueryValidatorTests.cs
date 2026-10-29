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

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("  ")]
    [InlineData("active")]
    [InlineData("Relieved")]
    [InlineData(" ALL ")]
    public void The_known_statuses_are_valid_in_any_letter_case(string? status)
        => Assert.True(Validator.Validate(new EmployeeListQuery { Status = status }).IsValid);

    [Theory]
    [InlineData("left")]
    [InlineData("1")]
    public void Another_status_is_rejected_and_named(string status)
        => Assert.Equal(["Status"], Validator.Validate(new EmployeeListQuery { Status = status }).Errors.Select(e => e.PropertyName));

    [Fact]
    public void A_branch_longer_than_40_characters_is_rejected_and_named()
    {
        Assert.Equal(["Branch"], Validator.Validate(new EmployeeListQuery { Branch = new string('b', 41) }).Errors.Select(e => e.PropertyName));
        Assert.True(Validator.Validate(new EmployeeListQuery { Branch = new string('b', 40) }).IsValid);
        Assert.True(Validator.Validate(new EmployeeListQuery { Branch = "all" }).IsValid);
    }
}
