using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using iErp.Data;
using iErp.Entities;

namespace iErp.Tests.Unit;

/// <summary>The read-only USERM mapping, checked on the model only (no database connection is opened).</summary>
public class UserMappingTests
{
    private static IEntityType Model()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseOracle("User Id=model;Password=model;Data Source=localhost:1521/model").Options;
        using var db = new AppDbContext(options);
        return db.GetService<IDesignTimeModel>().Model.FindEntityType(typeof(User))!;
    }

    [Fact]
    public void Maps_USERM_and_is_excluded_from_migrations()
    {
        var entity = Model();

        Assert.Equal("USERM", entity.GetTableName());
    }

    [Fact]
    public void Maps_the_employee_id_as_an_optional_40_character_column()
    {
        var property = Model().FindProperty(nameof(User.EmployeeId))!;

        Assert.Equal("USER_EMP_ID", property.GetColumnName(StoreObjectIdentifier.Table("USERM", null)));
        Assert.Equal(40, property.GetMaxLength());
        Assert.True(property.IsNullable);
    }
}
