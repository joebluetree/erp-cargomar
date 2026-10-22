using FluentValidation;
using iErp.Shared.Paging;

namespace iErp.Reports.BranchList;

/// <summary>The query string of <c>GET /api/reports/branches</c>: two filters and the common paging values.</summary>
public class BranchListQuery
{
    /// <summary>The longest filter text accepted.</summary>
    public const int MaxFilterLength = 60;

    /// <summary>Branches whose code contains this text, ignoring letter case. Blank means no restriction.</summary>
    public string? Code { get; set; }

    /// <summary>Branches whose name contains this text, ignoring letter case. Blank means no restriction.</summary>
    public string? Name { get; set; }

    /// <summary>One-based page number.</summary>
    public int Page { get; set; } = PagingRules.DefaultPage;

    public int PageSize { get; set; } = PagingRules.DefaultPageSize;
}

public class BranchListQueryValidator : AbstractValidator<BranchListQuery>
{
    public BranchListQueryValidator()
    {
        RuleFor(q => q.Page).GreaterThanOrEqualTo(1)
            .WithMessage("Page must be 1 or more.");

        RuleFor(q => q.PageSize)
            .Must(PagingRules.IsAllowedPageSize)
            .WithMessage($"Page size must be one of {string.Join(", ", PagingRules.AllowedPageSizes)}.");

        RuleFor(q => q.Code).MaximumLength(BranchListQuery.MaxFilterLength)
            .WithMessage($"Code must be at most {BranchListQuery.MaxFilterLength} characters.");

        RuleFor(q => q.Name).MaximumLength(BranchListQuery.MaxFilterLength)
            .WithMessage($"Name must be at most {BranchListQuery.MaxFilterLength} characters.");
    }
}
