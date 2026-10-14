using iErp.Admin.Login;

namespace iErp.Tests.Admin;

public class LoginRequestValidatorTests
{
    private static readonly LoginRequestValidator Validator = new();

    private static LoginRequest Valid() => new() { UserCode = "admin", Password = "secret", CompanyCode = "CMP" };

    [Fact]
    public void A_complete_request_is_valid() => Assert.True(Validator.Validate(Valid()).IsValid);

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Each_field_is_required_and_not_blank(string? value)
    {
        var result = Validator.Validate(new LoginRequest { UserCode = value, Password = value, CompanyCode = value });

        Assert.Contains(result.Errors, e => e.PropertyName == "UserCode" && e.ErrorMessage == "User code is required.");
        Assert.Contains(result.Errors, e => e.PropertyName == "Password" && e.ErrorMessage == "Password is required.");
        Assert.Contains(result.Errors, e => e.PropertyName == "CompanyCode" && e.ErrorMessage == "Company code is required.");
    }

    [Fact]
    public void Values_longer_than_their_columns_are_refused()
    {
        var request = Valid();
        request.UserCode = new string('u', LoginRequest.MaxUserCodeLength + 1);
        request.Password = new string('p', LoginRequest.MaxPasswordLength + 1);
        request.CompanyCode = new string('c', LoginRequest.MaxCompanyCodeLength + 1);

        var result = Validator.Validate(request);

        Assert.Equal(["CompanyCode", "Password", "UserCode"], result.Errors.Select(e => e.PropertyName).Order());
    }

    [Fact]
    public void Values_at_their_column_length_are_accepted()
    {
        var request = new LoginRequest
        {
            UserCode = new string('u', LoginRequest.MaxUserCodeLength),
            Password = new string('p', LoginRequest.MaxPasswordLength),
            CompanyCode = new string('c', LoginRequest.MaxCompanyCodeLength),
        };

        Assert.True(Validator.Validate(request).IsValid);
    }
}
