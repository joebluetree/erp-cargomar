using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using iErp.Data;
using iErp.Entities;

namespace iErp.Tests.Unit;

/// <summary>The read-only USERD mapping, checked on the model only (no database connection is opened).</summary>
public class UserBranchMappingTests
{
    private static IEntityType Model()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseOracle("User Id=model;Password=model;Data Source=localhost:1521/model").Options;
        using var db = new AppDbContext(options);
        // The design-time model keeps the migration settings (ExcludeFromMigrations).
        return db.GetService<IDesignTimeModel>().Model.FindEntityType(typeof(UserBranch))!;
    }

    [Fact]
    public void Maps_USERD_by_user_and_branch_and_is_excluded_from_migrations()
    {
        var entity = Model();
        var table = StoreObjectIdentifier.Table("USERD", null);

        Assert.Equal("USERD", entity.GetTableName());
        Assert.True(entity.IsTableExcludedFromMigrations());
        Assert.Equal(["UserId", "BranchId"], entity.FindPrimaryKey()!.Properties.Select(p => p.Name));
        Assert.Equal("USER_ID", entity.FindProperty(nameof(UserBranch.UserId))!.GetColumnName(table));
        Assert.Equal("USER_BRANCH_ID", entity.FindProperty(nameof(UserBranch.BranchId))!.GetColumnName(table));
        Assert.All(entity.GetProperties(), p => Assert.Equal(40, p.GetMaxLength()));
    }

    [Fact]
    public void Maps_only_the_two_key_columns_never_the_credentials()
    {
        var columns = Model().GetProperties().Select(p => p.GetColumnName()).Order();

        Assert.Equal(["USER_BRANCH_ID", "USER_ID"], columns);
    }
}
