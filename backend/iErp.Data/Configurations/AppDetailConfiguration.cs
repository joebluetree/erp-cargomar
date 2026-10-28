using iErp.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace iErp.Data.Configurations;

/// <summary>
/// Maps the existing <c>APPDETAILS</c> table read-only. It is excluded from migrations, so migrations never create,
/// alter or drop it. Only the columns the automatic login needs are mapped.
/// </summary>
public class AppDetailConfiguration : IEntityTypeConfiguration<AppDetail>
{
    public void Configure(EntityTypeBuilder<AppDetail> builder)
    {
        builder.ToTable("APPDETAILS");
        builder.HasKey(a => a.Id);

        builder.Property(a => a.Id).HasColumnName("USER_APPID").HasMaxLength(80).ValueGeneratedNever();
        builder.Property(a => a.UserCode).HasColumnName("USER_CODE").HasMaxLength(30);
        builder.Property(a => a.Password).HasColumnName("USER_PASSWORD").HasMaxLength(100);
        builder.Property(a => a.CompanyCode).HasColumnName("USER_COMPANY_CODE").HasMaxLength(20);
        builder.Property(a => a.BranchId).HasColumnName("USER_BRANCH_ID").HasMaxLength(80);
        builder.Property(a => a.YearId).HasColumnName("USER_YEAR_ID").HasMaxLength(80);
        builder.Property(a => a.LoggedOut).HasColumnName("USER_LOGGED_OUT").HasMaxLength(1).IsFixedLength();
    }
}
