using FluentValidation;
using iErp.Shared.Paging;

namespace iErp.Reports.CompanyList;

public class CompanyListQueryValidator : AbstractValidator<CompanyListQuery>
{
    public CompanyListQueryValidator()
    {
        RuleFor(q => q.Page).GreaterThanOrEqualTo(1)
            .WithMessage("Page must be 1 or more.");

        RuleFor(q => q.PageSize)
            .Must(PagingRules.IsAllowedPageSize)
            .WithMessage($"Page size must be one of {string.Join(", ", PagingRules.AllowedPageSizes)}.");

        RuleFor(q => q.Code).MaximumLength(CompanyListQuery.MaxFilterLength)
            .WithMessage($"Code must be at most {CompanyListQuery.MaxFilterLength} characters.");

        RuleFor(q => q.Name).MaximumLength(CompanyListQuery.MaxFilterLength)
            .WithMessage($"Name must be at most {CompanyListQuery.MaxFilterLength} characters.");
    }
}
