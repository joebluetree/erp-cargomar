namespace iErp.Entities;

/// <summary>
/// A row of the existing, externally owned <c>EMPM</c> table: one employee. It is read-only here; this system never
/// writes or migrates it. Only the columns the employee profile shows are mapped.
/// </summary>
public class Employee
{
    /// <summary>Opaque string key (<c>EMP_PKID</c>), not a GUID; a user's <see cref="User.EmployeeId"/>.</summary>
    public string Id { get; set; } = "";
    /// <summary>The employee's code (<c>EMP_NO</c>); the table has no <c>EMP_CODE</c> column.</summary>
    public string? Code { get; set; }
    public string? Name { get; set; }
    public string? FatherName { get; set; }
    public string? SpouseName { get; set; }
    public string? MaritalStatus { get; set; }
    public DateTime? DateOfBirth { get; set; }

    public string? BankAccountNo { get; set; }
    public string? BankName { get; set; }
    public string? BankBranch { get; set; }
    public string? IfscCode { get; set; }

    // The current address (EMP_LOCAL_*). State and country are PARAM ids (types STATE and COUNTRY).
    public string? LocalAddress1 { get; set; }
    public string? LocalAddress2 { get; set; }
    public string? LocalAddress3 { get; set; }
    public string? LocalCity { get; set; }
    public string? LocalStateId { get; set; }
    public string? LocalPin { get; set; }
    public string? LocalPoBox { get; set; }
    public string? LocalCountryId { get; set; }

    // The permanent address (EMP_HOME_*), with state and country as PARAM ids too.
    public string? HomeAddress1 { get; set; }
    public string? HomeAddress2 { get; set; }
    public string? HomeAddress3 { get; set; }
    public string? HomeCity { get; set; }
    public string? HomeStateId { get; set; }
    public string? HomePin { get; set; }
    public string? HomePoBox { get; set; }
    public string? HomeCountryId { get; set; }

    public string? Mobile { get; set; }
    /// <summary>The personal email (<c>EMP_EMAIL_PERSONAL</c>).</summary>
    public string? Email { get; set; }

    public string? AadhaarNo { get; set; }
    public string? Pan { get; set; }
    public string? PfNo { get; set; }
    public string? EsiNo { get; set; }
    public string? UanNo { get; set; }

    /// <summary>The photo's file name (<c>EMP_IMAGE_NAME</c>), looked up in the configured images folder.</summary>
    public string? ImageName { get; set; }

    /// <summary>The <see cref="Company.Code"/> of the employee's company (<c>REC_COMPANY_CODE</c>).</summary>
    public string? CompanyCode { get; set; }
    /// <summary>The <see cref="Company.Code"/> of the employee's branch (<c>REC_BRANCH_CODE</c>), not its id.</summary>
    public string? BranchCode { get; set; }
    /// <summary>"Y" once the employee has left, "N" while employed (<c>EMP_IS_RELIEVED</c>).</summary>
    public string? Relieved { get; set; }
}
