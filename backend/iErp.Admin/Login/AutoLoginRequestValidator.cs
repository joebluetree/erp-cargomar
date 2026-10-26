using FluentValidation;

namespace iErp.Admin.Login;

/// <summary>The app id is required, not blank, and no longer than its column.</summary>
public class AutoLoginRequestValidator : AbstractValidator<AutoLoginRequest>
{
    public AutoLoginRequestValidator()
    {
        RuleFor(r => r.AppId)
            .Must(id => !string.IsNullOrWhiteSpace(id)).WithMessage("App id is required.")
            .MaximumLength(AutoLoginRequest.MaxAppIdLength)
            .WithMessage($"App id must be at most {AutoLoginRequest.MaxAppIdLength} characters.");
    }
}
