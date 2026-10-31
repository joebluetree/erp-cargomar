using iErp.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace iErp.Data.Configurations;

/// <summary>
/// Maps the existing <c>GENINFO</c> table read-only. It is excluded from migrations, so migrations never create, alter
/// or drop it. The table has no key (and <c>ID</c> may be null or repeated), so the entity is keyless: its rows are
/// never tracked and cannot be saved.
/// </summary>
public class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> builder)
    {
        builder.ToTable("GENINFO");
        builder.HasNoKey();

        builder.Property(n => n.Id).HasColumnName("ID");
        builder.Property(n => n.Banner).HasColumnName("BANNER").HasMaxLength(1000);
        builder.Property(n => n.Heading).HasColumnName("HEADING").HasMaxLength(1000);
        builder.Property(n => n.Content).HasColumnName("CONTENT").HasMaxLength(2000);
        builder.Property(n => n.Visible).HasColumnName("VISIBLE").HasMaxLength(1).IsFixedLength();
        builder.Property(n => n.CreatedDate).HasColumnName("REC_CREATED_DATE");
    }
}
