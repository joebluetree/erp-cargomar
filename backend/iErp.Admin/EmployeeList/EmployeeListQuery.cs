using iErp.Shared.Paging;

namespace iErp.Admin.EmployeeList;

/// <summary>The query string of <c>GET /api/admin/employees</c>: the filters and the common paging values.</summary>
public class EmployeeListQuery
{
    /// <summary>The longest filter text accepted.</summary>
    public const int MaxFilterLength = 60;

    /// <summary>The longest <see cref="Branch"/> accepted (a <c>COMPANYM</c> id).</summary>
    public const int MaxBranchLength = 40;

    /// <summary>Employees whose code (<c>EMP_NO</c>) contains this text, ignoring letter case. Blank means no restriction.</summary>
    public string? Code { get; set; }

    /// <summary>Employees whose name contains this text, ignoring letter case. Blank means no restriction.</summary>
    public string? Name { get; set; }

    /// <summary>
    /// <see cref="EmployeeStatus.Active"/>, <see cref="EmployeeStatus.Relieved"/> or <see cref="EmployeeStatus.All"/>,
    /// in any letter case. Blank means active.
    /// </summary>
    public string? Status { get; set; }

    /// <summary>
    /// For an admin of the Employee List, the id of one of the company's branches, or <c>all</c> in any letter case.
    /// Blank means the session's branch (admin-emp-status design D5).
    /// </summary>
    public string? Branch { get; set; }

    /// <summary>One-based page number.</summary>
    public int Page { get; set; } = PagingRules.DefaultPage;

    public int PageSize { get; set; } = PagingRules.DefaultPageSize;
}
