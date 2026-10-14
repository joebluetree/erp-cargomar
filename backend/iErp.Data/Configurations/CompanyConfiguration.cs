using iErp.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace iErp.Data.Configurations;

/// <summary>
/// Maps the existing <c>COMPANYM</c> table read-only. It is excluded from migrations, so migrations never
/// create, alter or drop it.
/// </summary>
public class CompanyConfiguration : IEntityTypeConfiguration<Company>
{
    public void Configure(EntityTypeBuilder<Company> builder)
    {
        builder.ToTable("COMPANYM", t => t.ExcludeFromMigrations());
        builder.HasKey(c => c.Id);

        builder.Property(c => c.Id).HasColumnName("COMP_PKID").HasMaxLength(40).ValueGeneratedNever();
        builder.Property(c => c.Type).HasColumnName("COMP_TYPE").HasMaxLength(1);
        builder.Property(c => c.ParentId).HasColumnName("COMP_PARENT_ID").HasMaxLength(40);
        builder.Property(c => c.Code).HasColumnName("COMP_CODE").HasMaxLength(10);
        builder.Property(c => c.Name).HasColumnName("COMP_NAME").HasMaxLength(60);
        builder.Property(c => c.Address1).HasColumnName("COMP_ADDRESS1").HasMaxLength(60);
        builder.Property(c => c.Address2).HasColumnName("COMP_ADDRESS2").HasMaxLength(60);
        builder.Property(c => c.Address3).HasColumnName("COMP_ADDRESS3").HasMaxLength(60);
        builder.Property(c => c.Tel).HasColumnName("COMP_TEL").HasMaxLength(60);
        builder.Property(c => c.Email).HasColumnName("COMP_EMAIL").HasMaxLength(60);
        builder.Property(c => c.Web).HasColumnName("COMP_WEB").HasMaxLength(60);
        builder.Property(c => c.DeletedDate).HasColumnName("REC_DELETED_DATE");
    }
}
