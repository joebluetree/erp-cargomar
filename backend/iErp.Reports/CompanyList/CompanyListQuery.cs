using iErp.Shared.Paging;

namespace iErp.Reports.CompanyList;

/// <summary>The query string of <c>GET /api/reports/companies</c>: two filters and the common paging values.</summary>
public class CompanyListQuery
{
    /// <summary>The longest filter text accepted.</summary>
    public const int MaxFilterLength = 60;

    /// <summary>Companies whose code contains this text, ignoring letter case. Blank means no restriction.</summary>
    public string? Code { get; set; }

    /// <summary>Companies whose name contains this text, ignoring letter case. Blank means no restriction.</summary>
    public string? Name { get; set; }

    /// <summary>One-based page number.</summary>
    public int Page { get; set; } = PagingRules.DefaultPage;

    public int PageSize { get; set; } = PagingRules.DefaultPageSize;
}
