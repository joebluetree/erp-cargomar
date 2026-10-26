using iErp.Admin.Login;

namespace iErp.Tests.Admin;

public class AutoLoginRequestValidatorTests
{
    private static readonly AutoLoginRequestValidator Validator = new();

    [Fact]
    public void An_app_id_is_valid() =>
        Assert.True(Validator.Validate(new AutoLoginRequest { AppId = "6f1c2a7e-0b9d-4c55-9a51-2f6d8e3b7a10" }).IsValid);

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void The_app_id_is_required_and_not_blank(string? value)
    {
        var result = Validator.Validate(new AutoLoginRequest { AppId = value });

        Assert.Contains(result.Errors, e => e.PropertyName == "AppId" && e.ErrorMessage == "App id is required.");
    }

    [Fact]
    public void An_app_id_longer_than_its_column_is_refused()
    {
        var result = Validator.Validate(new AutoLoginRequest { AppId = new string('a', AutoLoginRequest.MaxAppIdLength + 1) });

        Assert.Equal(["AppId"], result.Errors.Select(e => e.PropertyName));
    }
}
