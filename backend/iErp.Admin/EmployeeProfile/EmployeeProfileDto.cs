namespace iErp.Admin.EmployeeProfile;

/// <summary>
/// The logged-in user's own employee profile, grouped as the Profile screen shows it. Text values are trimmed and an
/// empty value is null; state and country are names, never PARAM ids (design D4).
/// </summary>
/// <param name="HasPhoto">True when the photo can be fetched from <c>GET api/admin/profile/photo</c> (design D7).</param>
public record EmployeeProfileDto(
    string? Code,
    string? Name,
    string? FatherName,
    string? SpouseName,
    string? MaritalStatus,
    DateOnly? DateOfBirth,
    BankDetailsDto Bank,
    AddressDto CurrentAddress,
    AddressDto PermanentAddress,
    string? Mobile,
    string? Email,
    IdNumbersDto Ids,
    bool HasPhoto);

public record BankDetailsDto(string? AccountNo, string? Name, string? Branch, string? Ifsc);

public record AddressDto(
    string? Address1,
    string? Address2,
    string? Address3,
    string? City,
    string? State,
    string? Pin,
    string? PoBox,
    string? Country);

public record IdNumbersDto(string? Aadhaar, string? Pan, string? Pf, string? Esi, string? Uan);
