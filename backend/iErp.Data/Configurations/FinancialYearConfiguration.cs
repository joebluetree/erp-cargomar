using iErp.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace iErp.Data.Configurations;

/// <summary>
/// Maps the existing <c>YEARM</c> table read-only. It is excluded from migrations, so migrations never
/// create, alter or drop it. Only the columns the login needs are mapped.
/// </summary>
public class FinancialYearConfiguration : IEntityTypeConfiguration<FinancialYear>
{
    public void Configure(EntityTypeBuilder<FinancialYear> builder)
    {
        builder.ToTable("YEARM", t => t.ExcludeFromMigrations());
        builder.HasKey(y => y.Id);

        builder.Property(y => y.Id).HasColumnName("YEAR_PKID").HasMaxLength(40).ValueGeneratedNever();
        builder.Property(y => y.Code).HasColumnName("YEAR_CODE");
        builder.Property(y => y.Name).HasColumnName("YEAR_NAME").HasMaxLength(25);
        builder.Property(y => y.StartDate).HasColumnName("YEAR_START_DATE");
        builder.Property(y => y.EndDate).HasColumnName("YEAR_END_DATE");
        builder.Property(y => y.Closed).HasColumnName("YEAR_CLOSED").HasMaxLength(1).IsFixedLength();
        builder.Property(y => y.CompanyCode).HasColumnName("REC_COMPANY_CODE").HasMaxLength(15);
    }
}
