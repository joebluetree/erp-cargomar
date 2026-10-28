using iErp.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace iErp.Data.Configurations;

/// <summary>
/// Maps the existing <c>USERD</c> table read-only. It is excluded from migrations, so migrations never create, alter
/// or drop it. Only <c>USER_ID</c> and <c>USER_BRANCH_ID</c> are mapped, so its other columns (rights, ICEGATE id and
/// password) are never selected.
/// </summary>
public class UserBranchConfiguration : IEntityTypeConfiguration<UserBranch>
{
    public void Configure(EntityTypeBuilder<UserBranch> builder)
    {
        builder.ToTable("USERD");
        builder.HasKey(b => new { b.UserId, b.BranchId });

        builder.Property(b => b.UserId).HasColumnName("USER_ID").HasMaxLength(40).ValueGeneratedNever();
        builder.Property(b => b.BranchId).HasColumnName("USER_BRANCH_ID").HasMaxLength(40).ValueGeneratedNever();
    }
}
