using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using iErp.Data;
using iErp.Entities;

namespace iErp.Tests.Unit;

/// <summary>The read-only EMPM mapping, checked on the model only (no database connection is opened).</summary>
public class EmployeeMappingTests
{
    private static IEntityType Model()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseOracle("User Id=model;Password=model;Data Source=localhost:1521/model").Options;
        using var db = new AppDbContext(options);
        return db.GetService<IDesignTimeModel>().Model.FindEntityType(typeof(Employee))!;
    }

    [Fact]
    public void Maps_EMPM_and_is_excluded_from_migrations()
    {
        var entity = Model();

        Assert.Equal("EMPM", entity.GetTableName());
        Assert.Equal(nameof(Employee.Id), Assert.Single(entity.FindPrimaryKey()!.Properties).Name);
    }

    [Theory]
    [InlineData(nameof(Employee.Id), "EMP_PKID", 40)]
    [InlineData(nameof(Employee.Code), "EMP_NO", 30)]
    [InlineData(nameof(Employee.Name), "EMP_NAME", 100)]
    [InlineData(nameof(Employee.FatherName), "EMP_FATHER_NAME", 60)]
    [InlineData(nameof(Employee.SpouseName), "EMP_SPOUSE_NAME", 60)]
    [InlineData(nameof(Employee.MaritalStatus), "EMP_MARITAL_STATUS", 10)]
    [InlineData(nameof(Employee.BankAccountNo), "EMP_BANK_ACNO", 50)]
    [InlineData(nameof(Employee.BankName), "EMP_BANK_NAME", 60)]
    [InlineData(nameof(Employee.BankBranch), "EMP_BANK_BRANCH", 60)]
    [InlineData(nameof(Employee.IfscCode), "EMP_IFSC_CODE", 20)]
    [InlineData(nameof(Employee.LocalAddress1), "EMP_LOCAL_ADDRESS1", 60)]
    [InlineData(nameof(Employee.LocalAddress2), "EMP_LOCAL_ADDRESS2", 60)]
    [InlineData(nameof(Employee.LocalAddress3), "EMP_LOCAL_ADDRESS3", 60)]
    [InlineData(nameof(Employee.LocalCity), "EMP_LOCAL_CITY", 60)]
    [InlineData(nameof(Employee.LocalStateId), "EMP_LOCAL_STATE_ID", 40)]
    [InlineData(nameof(Employee.LocalPin), "EMP_LOCAL_PIN", 15)]
    [InlineData(nameof(Employee.LocalPoBox), "EMP_LOCAL_POBOX", 15)]
    [InlineData(nameof(Employee.LocalCountryId), "EMP_LOCAL_COUNTRY_ID", 40)]
    [InlineData(nameof(Employee.HomeAddress1), "EMP_HOME_ADDRESS1", 60)]
    [InlineData(nameof(Employee.HomeAddress2), "EMP_HOME_ADDRESS2", 60)]
    [InlineData(nameof(Employee.HomeAddress3), "EMP_HOME_ADDRESS3", 60)]
    [InlineData(nameof(Employee.HomeCity), "EMP_HOME_CITY", 60)]
    [InlineData(nameof(Employee.HomeStateId), "EMP_HOME_STATE_ID", 40)]
    [InlineData(nameof(Employee.HomePin), "EMP_HOME_PIN", 15)]
    [InlineData(nameof(Employee.HomePoBox), "EMP_HOME_POBOX", 15)]
    [InlineData(nameof(Employee.HomeCountryId), "EMP_HOME_COUNTRY_ID", 40)]
    [InlineData(nameof(Employee.Mobile), "EMP_MOBILE", 30)]
    [InlineData(nameof(Employee.Email), "EMP_EMAIL_PERSONAL", 60)]
    [InlineData(nameof(Employee.AadhaarNo), "EMP_ADHAR_NO", 20)]
    [InlineData(nameof(Employee.Pan), "EMP_PAN", 50)]
    [InlineData(nameof(Employee.PfNo), "EMP_PFNO", 50)]
    [InlineData(nameof(Employee.EsiNo), "EMP_ESINO", 50)]
    [InlineData(nameof(Employee.UanNo), "EMP_UAN_NO", 20)]
    [InlineData(nameof(Employee.ImageName), "EMP_IMAGE_NAME", 35)]
    [InlineData(nameof(Employee.CompanyCode), "REC_COMPANY_CODE", 15)]
    [InlineData(nameof(Employee.BranchCode), "REC_BRANCH_CODE", 15)]
    [InlineData(nameof(Employee.Relieved), "EMP_IS_RELIEVED", 1)]
    public void Maps_each_text_column(string property, string column, int length)
    {
        var mapped = Model().FindProperty(property)!;

        Assert.Equal(column, mapped.GetColumnName(StoreObjectIdentifier.Table("EMPM", null)));
        Assert.Equal(length, mapped.GetMaxLength());
    }

    [Fact]
    public void Maps_the_date_of_birth_as_an_optional_date()
    {
        var property = Model().FindProperty(nameof(Employee.DateOfBirth))!;

        Assert.Equal("EMP_DO_BIRTH", property.GetColumnName(StoreObjectIdentifier.Table("EMPM", null)));
        Assert.Equal(typeof(DateTime?), property.ClrType);
        Assert.True(property.IsNullable);
    }

    [Fact]
    public void Maps_only_the_profile_columns()
    {
        // 37 text columns (with the photo file name, company, branch and relieved flag) and the date of birth; the other EMPM columns (salary limits, remarks, ...) are never selected.
        Assert.Equal(38, Model().GetProperties().Count());
    }
}
