namespace iErp.Reports.CompanyList;

/// <summary>One row of the Company List report. Optional values are empty strings, never null.</summary>
public record CompanyListItemDto(
    string Id,
    string Code,
    string Name,
    string Address1,
    string Address2,
    string Address3,
    string Tel,
    string Email,
    string Web);
