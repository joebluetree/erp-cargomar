namespace iErp.Admin.EmployeeList;

/// <summary>
/// One row of the Employee List. Text is trimmed and an empty value is null. <c>Address</c> is the current address
/// lines 1 to 3 joined with ", ", empty lines left out.
/// </summary>
public record EmployeeListItemDto(
    string Id,
    string? Code,
    string? Name,
    string? FatherName,
    DateOnly? DateOfBirth,
    string? Address,
    string? Mobile,
    string? Email);
