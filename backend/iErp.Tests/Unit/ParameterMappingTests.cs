using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using iErp.Data;
using iErp.Entities;

namespace iErp.Tests.Unit;

/// <summary>The read-only PARAM mapping, checked on the model only (no database connection is opened).</summary>
public class ParameterMappingTests
{
    private static IEntityType Model()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseOracle("User Id=model;Password=model;Data Source=localhost:1521/model").Options;
        using var db = new AppDbContext(options);
        return db.GetService<IDesignTimeModel>().Model.FindEntityType(typeof(Parameter))!;
    }

    [Fact]
    public void Maps_PARAM_and_is_excluded_from_migrations()
    {
        var entity = Model();

        Assert.Equal("PARAM", entity.GetTableName());
        Assert.Equal(3, entity.GetProperties().Count());
    }

    [Theory]
    [InlineData(nameof(Parameter.Id), "PARAM_PKID", 40)]
    [InlineData(nameof(Parameter.Type), "PARAM_TYPE", 30)]
    [InlineData(nameof(Parameter.Name), "PARAM_NAME", 200)]
    public void Maps_each_column(string property, string column, int length)
    {
        var mapped = Model().FindProperty(property)!;

        Assert.Equal(column, mapped.GetColumnName(StoreObjectIdentifier.Table("PARAM", null)));
        Assert.Equal(length, mapped.GetMaxLength());
    }
}
