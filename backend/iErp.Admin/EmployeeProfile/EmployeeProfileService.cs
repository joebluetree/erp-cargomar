using iErp.Entities;
using iErp.Shared.Auth;

namespace iErp.Admin.EmployeeProfile;

/// <summary>
/// Builds employee profiles and finds their photos: the logged-in user's own (the employee comes from the token,
/// <see cref="ICurrentSession"/>, design D2, D7), and those of the employees in the session's scope that the Employee
/// List opens (admin-emp-list design D3); for an admin of the Employee List the scope is their allowed branches
/// (admin-emp-status design D5). An employee outside the scope is treated as not found. Both use the same
/// mapping, so the two profiles always show the same fields.
/// </summary>
public class EmployeeProfileService(
    IEmployeeProfileRepository repository,
    ICurrentSession current,
    IEmployeePhotoStore photos,
    IEmployeeScopeResolver scopes) : IEmployeeProfileService
{
    public async Task<EmployeeProfileDto?> GetOwnAsync(CancellationToken ct = default)
    {
        var employee = await FindOwnEmployeeAsync(ct);
        return employee is null ? null : await ToDtoAsync(employee, ct);
    }

    public async Task<EmployeePhoto?> GetOwnPhotoAsync(CancellationToken ct = default)
    {
        var employee = await FindOwnEmployeeAsync(ct);
        return employee is null ? null : photos.Find(employee.ImageName);
    }

    public async Task<EmployeeProfileDto?> GetAsync(string employeeId, CancellationToken ct = default)
    {
        var employee = await FindInScopeAsync(employeeId, ct);
        return employee is null ? null : await ToDtoAsync(employee, ct);
    }

    public async Task<EmployeePhoto?> GetPhotoAsync(string employeeId, CancellationToken ct = default)
    {
        var employee = await FindInScopeAsync(employeeId, ct);
        return employee is null ? null : photos.Find(employee.ImageName);
    }

    /// <summary>The session's employee, or null when the session has no employee id or the id names no employee.</summary>
    private async Task<Employee?> FindOwnEmployeeAsync(CancellationToken ct)
    {
        var employeeId = Clean(current.EmployeeId);
        return employeeId is null ? null : await repository.FindEmployeeAsync(employeeId, ct);
    }

    /// <summary>The employee with this id if they are in the session's scope; null otherwise.</summary>
    private async Task<Employee?> FindInScopeAsync(string employeeId, CancellationToken ct)
    {
        var id = Clean(employeeId);
        if (id is null)
            return null;
        var scope = await scopes.ResolveProfileAsync(ct);
        return scope is null ? null : await repository.FindInScopeAsync(id, scope, ct);
    }

    private async Task<EmployeeProfileDto> ToDtoAsync(Employee employee, CancellationToken ct)
    {
        var placeIds = new[] { employee.LocalStateId, employee.LocalCountryId, employee.HomeStateId, employee.HomeCountryId }
            .Select(Clean).OfType<string>().Distinct().ToList();
        var places = await repository.ListPlacesAsync(placeIds, ct);
        var states = Names(places, EmployeeProfileRepository.StateType);
        var countries = Names(places, EmployeeProfileRepository.CountryType);

        return new EmployeeProfileDto(
            Clean(employee.Code),
            Clean(employee.Name),
            Clean(employee.FatherName),
            Clean(employee.SpouseName),
            Clean(employee.MaritalStatus),
            employee.DateOfBirth is { } birth ? DateOnly.FromDateTime(birth) : null,
            new BankDetailsDto(Clean(employee.BankAccountNo), Clean(employee.BankName), Clean(employee.BankBranch), Clean(employee.IfscCode)),
            new AddressDto(
                Clean(employee.LocalAddress1), Clean(employee.LocalAddress2), Clean(employee.LocalAddress3),
                Clean(employee.LocalCity), Lookup(states, employee.LocalStateId), Clean(employee.LocalPin),
                Clean(employee.LocalPoBox), Lookup(countries, employee.LocalCountryId)),
            new AddressDto(
                Clean(employee.HomeAddress1), Clean(employee.HomeAddress2), Clean(employee.HomeAddress3),
                Clean(employee.HomeCity), Lookup(states, employee.HomeStateId), Clean(employee.HomePin),
                Clean(employee.HomePoBox), Lookup(countries, employee.HomeCountryId)),
            Clean(employee.Mobile),
            Clean(employee.Email),
            new IdNumbersDto(Clean(employee.AadhaarNo), Clean(employee.Pan), Clean(employee.PfNo), Clean(employee.EsiNo), Clean(employee.UanNo)),
            photos.Find(employee.ImageName) is not null);
    }

    /// <summary>The names of the parameters of one type, by id, so a state id never resolves to a country or the reverse.</summary>
    private static Dictionary<string, string?> Names(IEnumerable<Parameter> places, string type) =>
        places.Where(p => p.Type?.Trim() == type)
            .GroupBy(p => p.Id.Trim())
            .ToDictionary(g => g.Key, g => Clean(g.First().Name));

    private static string? Lookup(Dictionary<string, string?> names, string? id) =>
        Clean(id) is { } key && names.TryGetValue(key, out var name) ? name : null;

    /// <summary>The value without surrounding spaces; null when it is empty.</summary>
    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
