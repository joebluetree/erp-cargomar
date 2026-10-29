namespace iErp.Admin.EmployeeList;

/// <summary>
/// One row of the Employee List. Text is trimmed and an empty value is null. <c>Address</c> is the current address
/// lines 1 to 3 joined with ", ", empty lines left out. <c>Branch</c> is the name of the employee's branch, or its code
/// when the company has no branch with that code (admin-emp-status).
/// </summary>
public record EmployeeListItemDto(
    string Id,
    string? Code,
    string? Name,
    string? FatherName,
    DateOnly? DateOfBirth,
    string? Address,
    string? Mobile,
    string? Email,
    string? Branch);

/// <summary>One option of the Employee List's Branch filter: a branch of the session's company (admin-emp-status D6).</summary>
public record EmployeeBranchDto(string Id, string? Code, string? Name);
