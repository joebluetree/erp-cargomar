using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using iErp.Data;
using iErp.Entities;

namespace iErp.Tests.Unit;

/// <summary>The read-only YEARM mapping, checked on the model only (no database connection is opened).</summary>
public class FinancialYearMappingTests
{
    [Fact]
    public void Maps_the_closed_flag_to_YEAR_CLOSED_as_one_fixed_character()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseOracle("User Id=model;Password=model;Data Source=localhost:1521/model").Options;
        using var db = new AppDbContext(options);
        var entity = db.GetService<IDesignTimeModel>().Model.FindEntityType(typeof(FinancialYear))!;

        var closed = entity.FindProperty(nameof(FinancialYear.Closed))!;
        Assert.Equal("YEAR_CLOSED", closed.GetColumnName(StoreObjectIdentifier.Table("YEARM", null)));
        Assert.Equal((1, true), (closed.GetMaxLength(), closed.IsFixedLength()));
        Assert.True(entity.IsTableExcludedFromMigrations());
    }
}
