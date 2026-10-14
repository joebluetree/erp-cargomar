using FluentValidation;

namespace iErp.Admin.ChangeBranch;

/// <summary>Branch and year are both required and not blank (BR-001.1), and no longer than their key columns.</summary>
public class ChangeBranchRequestValidator : AbstractValidator<ChangeBranchRequest>
{
    public ChangeBranchRequestValidator()
    {
        RuleFor(r => r.BranchId)
            .Must(NotBlank).WithMessage("Branch is required.")
            .MaximumLength(ChangeBranchRequest.MaxIdLength)
            .WithMessage($"Branch must be at most {ChangeBranchRequest.MaxIdLength} characters.");

        RuleFor(r => r.YearId)
            .Must(NotBlank).WithMessage("Year is required.")
            .MaximumLength(ChangeBranchRequest.MaxIdLength)
            .WithMessage($"Year must be at most {ChangeBranchRequest.MaxIdLength} characters.");
    }

    private static bool NotBlank(string? value) => !string.IsNullOrWhiteSpace(value);
}
