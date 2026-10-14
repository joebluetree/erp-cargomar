using iErp.Admin.ChangeBranch;

namespace iErp.Tests.Admin;

public class ChangeBranchRequestValidatorTests
{
    private static readonly ChangeBranchRequestValidator Validator = new();

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Branch_and_year_are_required(string? value)
    {
        var result = Validator.Validate(new ChangeBranchRequest { BranchId = value, YearId = value });

        Assert.Contains(result.Errors, e => e.PropertyName == "BranchId" && e.ErrorMessage == "Branch is required.");
        Assert.Contains(result.Errors, e => e.PropertyName == "YearId" && e.ErrorMessage == "Year is required.");
    }

    [Fact]
    public void Ids_longer_than_their_columns_are_refused()
    {
        var tooLong = new string('x', ChangeBranchRequest.MaxIdLength + 1);

        var result = Validator.Validate(new ChangeBranchRequest { BranchId = tooLong, YearId = tooLong });

        Assert.Equal(["BranchId", "YearId"], result.Errors.Select(e => e.PropertyName).Order());
    }

    [Fact]
    public void Ids_of_the_column_length_are_accepted()
    {
        var max = new string('x', ChangeBranchRequest.MaxIdLength);

        Assert.True(Validator.Validate(new ChangeBranchRequest { BranchId = max, YearId = max }).IsValid);
    }
}
