using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using iErp.Data;
using iErp.Entities;

namespace iErp.Tests.Unit;

/// <summary>The read-only GENINFO mapping, checked on the model only (no database connection is opened).</summary>
public class NotificationMappingTests
{
    private static IEntityType Model()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseOracle("User Id=model;Password=model;Data Source=localhost:1521/model").Options;
        using var db = new AppDbContext(options);
        return db.GetService<IDesignTimeModel>().Model.FindEntityType(typeof(Notification))!;
    }

    [Fact]
    public void Maps_GENINFO_without_a_key()
    {
        var entity = Model();

        Assert.Equal("GENINFO", entity.GetTableName());
        // The table has no key and ID may be null or repeated, so the rows are never tracked.
        Assert.Null(entity.FindPrimaryKey());
    }

    [Theory]
    [InlineData(nameof(Notification.Id), "ID", null)]
    [InlineData(nameof(Notification.Banner), "BANNER", 1000)]
    [InlineData(nameof(Notification.Heading), "HEADING", 1000)]
    [InlineData(nameof(Notification.Content), "CONTENT", 2000)]
    [InlineData(nameof(Notification.Visible), "VISIBLE", 1)]
    [InlineData(nameof(Notification.CreatedDate), "REC_CREATED_DATE", null)]
    public void Maps_each_column(string property, string column, int? maxLength)
    {
        var p = Model().FindProperty(property)!;
        var table = StoreObjectIdentifier.Table("GENINFO", null);

        Assert.Equal(column, p.GetColumnName(table));
        Assert.Equal(maxLength, p.GetMaxLength());
        Assert.True(p.IsNullable);
    }
}
