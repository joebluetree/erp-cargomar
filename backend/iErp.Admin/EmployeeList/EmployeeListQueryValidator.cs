using FluentValidation;
using iErp.Shared.Paging;

namespace iErp.Admin.EmployeeList;

public class EmployeeListQueryValidator : AbstractValidator<EmployeeListQuery>
{
    public EmployeeListQueryValidator()
    {
        RuleFor(q => q.Page).GreaterThanOrEqualTo(1)
            .WithMessage("Page must be 1 or more.");

        RuleFor(q => q.PageSize)
            .Must(PagingRules.IsAllowedPageSize)
            .WithMessage($"Page size must be one of {string.Join(", ", PagingRules.AllowedPageSizes)}.");

        RuleFor(q => q.Code).MaximumLength(EmployeeListQuery.MaxFilterLength)
            .WithMessage($"Code must be at most {EmployeeListQuery.MaxFilterLength} characters.");

        RuleFor(q => q.Name).MaximumLength(EmployeeListQuery.MaxFilterLength)
            .WithMessage($"Name must be at most {EmployeeListQuery.MaxFilterLength} characters.");
    }
}
