using FluentValidation;

namespace iErp.Admin.Login;

/// <summary>All three fields are required and not blank (BR-001.1), and no longer than their columns.</summary>
public class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(r => r.UserCode)
            .Must(NotBlank).WithMessage("User code is required.")
            .MaximumLength(LoginRequest.MaxUserCodeLength)
            .WithMessage($"User code must be at most {LoginRequest.MaxUserCodeLength} characters.");

        RuleFor(r => r.Password)
            .Must(NotBlank).WithMessage("Password is required.")
            .MaximumLength(LoginRequest.MaxPasswordLength)
            .WithMessage($"Password must be at most {LoginRequest.MaxPasswordLength} characters.");

        RuleFor(r => r.CompanyCode)
            .Must(NotBlank).WithMessage("Company code is required.")
            .MaximumLength(LoginRequest.MaxCompanyCodeLength)
            .WithMessage($"Company code must be at most {LoginRequest.MaxCompanyCodeLength} characters.");
    }

    private static bool NotBlank(string? value) => !string.IsNullOrWhiteSpace(value);
}
