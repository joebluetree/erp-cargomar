using iErp.Admin.EmployeeProfile;
using iErp.Entities;
using iErp.Shared.Auth;
using iErp.Shared.Paging;

namespace iErp.Admin.EmployeeList;

/// <summary>A page of the Employee List, or why the branch asked for is refused (then <see cref="Page"/> is null).</summary>
public record EmployeeListResult(PagedResult<EmployeeListItemDto>? Page, BranchChoiceError Error = BranchChoiceError.None);

public interface IEmployeeListService
{
    /// <summary>
    /// One page of the employees in the scope of the session and the <c>branch</c> asked for; an empty page when the
    /// session has no scope.
    /// </summary>
    Task<EmployeeListResult> ListAsync(EmployeeListQuery query, CancellationToken ct = default);

    /// <summary>The allowed branches for the Branch filter, by name; empty for a user without an admin branch.</summary>
    Task<IReadOnlyList<EmployeeBranchDto>> ListBranchesAsync(CancellationToken ct = default);
}

/// <summary>
/// Lists the employees of the session's company and branch, or for an admin of the list of another allowed branch or all
/// of them, with the status asked for (admin-emp-list design D1, D2, admin-emp-status design D1, D5). The company always
/// comes from the token, never from the request.
/// </summary>
public class EmployeeListService(IEmployeeListRepository repository, IEmployeeScopeResolver scopes, ICurrentSession current)
    : IEmployeeListService
{
    public async Task<EmployeeListResult> ListAsync(EmployeeListQuery query, CancellationToken ct = default)
    {
        var (scope, error) = await scopes.ResolveListAsync(query.Branch, ct);
        if (error != BranchChoiceError.None)
            return new EmployeeListResult(null, error);
        if (scope is null)
            return new EmployeeListResult(new PagedResult<EmployeeListItemDto>([], 0, query.Page, query.PageSize));

        var (employees, total) = await repository.ListAsync(query, scope, ct);
        var branches = await BranchNamesAsync(employees, ct);
        return new EmployeeListResult(new PagedResult<EmployeeListItemDto>(
            employees.Select(e => ToDto(e, branches)).ToList(), total, query.Page, query.PageSize));
    }

    /// <summary>The names of the page's branches by code, read in one query for the codes on the page only.</summary>
    private async Task<Dictionary<string, string?>> BranchNamesAsync(IReadOnlyList<Employee> employees, CancellationToken ct)
    {
        var codes = employees.Select(e => Clean(e.BranchCode)).OfType<string>().Distinct().ToList();
        var companyId = Clean(current.CompanyId);
        if (codes.Count == 0 || companyId is null)
            return [];

        var branches = await repository.ListBranchesByCodeAsync(companyId, codes, ct);
        return branches
            .Where(b => Clean(b.Code) is not null)
            .GroupBy(b => Clean(b.Code)!)
            .ToDictionary(g => g.Key, g => Clean(g.First().Name));
    }

    public async Task<IReadOnlyList<EmployeeBranchDto>> ListBranchesAsync(CancellationToken ct = default) =>
        (await scopes.ListAllowedBranchesAsync(ct)).Select(b => new EmployeeBranchDto(b.Id.Trim(), Clean(b.Code), Clean(b.Name))).ToList();

    private static EmployeeListItemDto ToDto(Employee e, Dictionary<string, string?> branches) => new(
        e.Id,
        Clean(e.Code),
        Clean(e.Name),
        Clean(e.FatherName),
        e.DateOfBirth is { } birth ? DateOnly.FromDateTime(birth) : null,
        Clean(string.Join(", ", new[] { e.LocalAddress1, e.LocalAddress2, e.LocalAddress3 }.Select(Clean).OfType<string>())),
        Clean(e.Mobile),
        Clean(e.Email),
        Clean(e.BranchCode) is { } code ? (branches.GetValueOrDefault(code) ?? code) : null);

    /// <summary>The value without surrounding spaces; null when it is empty.</summary>
    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
