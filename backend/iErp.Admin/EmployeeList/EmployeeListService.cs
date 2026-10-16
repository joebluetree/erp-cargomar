using iErp.Admin.EmployeeProfile;
using iErp.Entities;
using iErp.Shared.Paging;

namespace iErp.Admin.EmployeeList;

public interface IEmployeeListService
{
    /// <summary>One page of the employees in the session's scope; an empty page when the session has no scope.</summary>
    Task<PagedResult<EmployeeListItemDto>> ListAsync(EmployeeListQuery query, CancellationToken ct = default);
}

/// <summary>
/// Lists the employees of the session's company and branch who are not relieved (admin-emp-list design D1, D2). The
/// scope always comes from the token, never from the request.
/// </summary>
public class EmployeeListService(IEmployeeListRepository repository, IEmployeeScopeResolver scopes) : IEmployeeListService
{
    public async Task<PagedResult<EmployeeListItemDto>> ListAsync(EmployeeListQuery query, CancellationToken ct = default)
    {
        var scope = await scopes.ResolveAsync(ct);
        if (scope is null)
            return new PagedResult<EmployeeListItemDto>([], 0, query.Page, query.PageSize);

        var (employees, total) = await repository.ListAsync(query, scope, ct);
        return new PagedResult<EmployeeListItemDto>(employees.Select(ToDto).ToList(), total, query.Page, query.PageSize);
    }

    private static EmployeeListItemDto ToDto(Employee e) => new(
        e.Id,
        Clean(e.Code),
        Clean(e.Name),
        Clean(e.FatherName),
        e.DateOfBirth is { } birth ? DateOnly.FromDateTime(birth) : null,
        Clean(string.Join(", ", new[] { e.LocalAddress1, e.LocalAddress2, e.LocalAddress3 }.Select(Clean).OfType<string>())),
        Clean(e.Mobile),
        Clean(e.Email));

    /// <summary>The value without surrounding spaces; null when it is empty.</summary>
    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
