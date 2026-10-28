using iErp.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace iErp.Data.Configurations;

/// <summary>
/// Maps the existing <c>PARAM</c> lookup table read-only. It is excluded from migrations, so migrations never
/// create, alter or drop it. Only the id, type and name are mapped.
/// </summary>
public class ParameterConfiguration : IEntityTypeConfiguration<Parameter>
{
    public void Configure(EntityTypeBuilder<Parameter> builder)
    {
        builder.ToTable("PARAM");
        builder.HasKey(p => p.Id);

        builder.Property(p => p.Id).HasColumnName("PARAM_PKID").HasMaxLength(40).ValueGeneratedNever();
        builder.Property(p => p.Type).HasColumnName("PARAM_TYPE").HasMaxLength(30);
        builder.Property(p => p.Name).HasColumnName("PARAM_NAME").HasMaxLength(200);
    }
}
