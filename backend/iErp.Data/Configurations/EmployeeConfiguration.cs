using iErp.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace iErp.Data.Configurations;

/// <summary>
/// Maps the existing <c>EMPM</c> table read-only. It is excluded from migrations, so migrations never
/// create, alter or drop it. Only the columns the employee profile shows are mapped.
/// </summary>
public class EmployeeConfiguration : IEntityTypeConfiguration<Employee>
{
    public void Configure(EntityTypeBuilder<Employee> builder)
    {
        builder.ToTable("EMPM");
        builder.HasKey(e => e.Id);

        builder.Property(e => e.Id).HasColumnName("EMP_PKID").HasMaxLength(40).ValueGeneratedNever();
        builder.Property(e => e.Code).HasColumnName("EMP_NO").HasMaxLength(30);
        builder.Property(e => e.Name).HasColumnName("EMP_NAME").HasMaxLength(100);
        builder.Property(e => e.FatherName).HasColumnName("EMP_FATHER_NAME").HasMaxLength(60);
        builder.Property(e => e.SpouseName).HasColumnName("EMP_SPOUSE_NAME").HasMaxLength(60);
        builder.Property(e => e.MaritalStatus).HasColumnName("EMP_MARITAL_STATUS").HasMaxLength(10);
        builder.Property(e => e.DateOfBirth).HasColumnName("EMP_DO_BIRTH");

        builder.Property(e => e.BankAccountNo).HasColumnName("EMP_BANK_ACNO").HasMaxLength(50);
        builder.Property(e => e.BankName).HasColumnName("EMP_BANK_NAME").HasMaxLength(60);
        builder.Property(e => e.BankBranch).HasColumnName("EMP_BANK_BRANCH").HasMaxLength(60);
        builder.Property(e => e.IfscCode).HasColumnName("EMP_IFSC_CODE").HasMaxLength(20);

        builder.Property(e => e.LocalAddress1).HasColumnName("EMP_LOCAL_ADDRESS1").HasMaxLength(60);
        builder.Property(e => e.LocalAddress2).HasColumnName("EMP_LOCAL_ADDRESS2").HasMaxLength(60);
        builder.Property(e => e.LocalAddress3).HasColumnName("EMP_LOCAL_ADDRESS3").HasMaxLength(60);
        builder.Property(e => e.LocalCity).HasColumnName("EMP_LOCAL_CITY").HasMaxLength(60);
        builder.Property(e => e.LocalStateId).HasColumnName("EMP_LOCAL_STATE_ID").HasMaxLength(40);
        builder.Property(e => e.LocalPin).HasColumnName("EMP_LOCAL_PIN").HasMaxLength(15);
        builder.Property(e => e.LocalPoBox).HasColumnName("EMP_LOCAL_POBOX").HasMaxLength(15);
        builder.Property(e => e.LocalCountryId).HasColumnName("EMP_LOCAL_COUNTRY_ID").HasMaxLength(40);

        builder.Property(e => e.HomeAddress1).HasColumnName("EMP_HOME_ADDRESS1").HasMaxLength(60);
        builder.Property(e => e.HomeAddress2).HasColumnName("EMP_HOME_ADDRESS2").HasMaxLength(60);
        builder.Property(e => e.HomeAddress3).HasColumnName("EMP_HOME_ADDRESS3").HasMaxLength(60);
        builder.Property(e => e.HomeCity).HasColumnName("EMP_HOME_CITY").HasMaxLength(60);
        builder.Property(e => e.HomeStateId).HasColumnName("EMP_HOME_STATE_ID").HasMaxLength(40);
        builder.Property(e => e.HomePin).HasColumnName("EMP_HOME_PIN").HasMaxLength(15);
        builder.Property(e => e.HomePoBox).HasColumnName("EMP_HOME_POBOX").HasMaxLength(15);
        builder.Property(e => e.HomeCountryId).HasColumnName("EMP_HOME_COUNTRY_ID").HasMaxLength(40);

        builder.Property(e => e.Mobile).HasColumnName("EMP_MOBILE").HasMaxLength(30);
        builder.Property(e => e.Email).HasColumnName("EMP_EMAIL_PERSONAL").HasMaxLength(60);

        builder.Property(e => e.AadhaarNo).HasColumnName("EMP_ADHAR_NO").HasMaxLength(20);
        builder.Property(e => e.Pan).HasColumnName("EMP_PAN").HasMaxLength(50);
        builder.Property(e => e.PfNo).HasColumnName("EMP_PFNO").HasMaxLength(50);
        builder.Property(e => e.EsiNo).HasColumnName("EMP_ESINO").HasMaxLength(50);
        builder.Property(e => e.UanNo).HasColumnName("EMP_UAN_NO").HasMaxLength(20);
        builder.Property(e => e.ImageName).HasColumnName("EMP_IMAGE_NAME").HasMaxLength(35);

        builder.Property(e => e.CompanyCode).HasColumnName("REC_COMPANY_CODE").HasMaxLength(15);
        builder.Property(e => e.BranchCode).HasColumnName("REC_BRANCH_CODE").HasMaxLength(15);
        builder.Property(e => e.Relieved).HasColumnName("EMP_IS_RELIEVED").HasMaxLength(1).IsFixedLength();
    }
}
