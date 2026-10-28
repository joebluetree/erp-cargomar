using iErp.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace iErp.Data.Configurations;

/// <summary>
/// Maps the existing <c>USERM</c> table read-only. It is excluded from migrations, so migrations never
/// create, alter or drop it. Only the columns the login needs are mapped.
/// </summary>
public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("USERM");
        builder.HasKey(u => u.Id);

        builder.Property(u => u.Id).HasColumnName("USER_PKID").HasMaxLength(40).ValueGeneratedNever();
        builder.Property(u => u.Code).HasColumnName("USER_CODE").HasMaxLength(15);
        builder.Property(u => u.Name).HasColumnName("USER_NAME").HasMaxLength(30);
        builder.Property(u => u.Password).HasColumnName("USER_PASSWORD").HasMaxLength(50);
        builder.Property(u => u.CompanyCode).HasColumnName("REC_COMPANY_CODE").HasMaxLength(10);
        builder.Property(u => u.BranchId).HasColumnName("USER_BRANCH_ID").HasMaxLength(40);
        builder.Property(u => u.EmployeeId).HasColumnName("USER_EMP_ID").HasMaxLength(40);
        builder.Property(u => u.Locked).HasColumnName("USER_ISLOCKED").HasMaxLength(1).IsFixedLength();
        builder.Property(u => u.Deleted).HasColumnName("REC_DELETED").HasMaxLength(1).IsFixedLength();
        builder.Property(u => u.DeletedDate).HasColumnName("REC_DELETED_DATE");
    }
}
