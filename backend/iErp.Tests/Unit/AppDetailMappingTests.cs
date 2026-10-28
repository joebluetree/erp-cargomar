using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using iErp.Data;
using iErp.Entities;

namespace iErp.Tests.Unit;

/// <summary>The read-only APPDETAILS mapping, checked on the model only (no database connection is opened).</summary>
public class AppDetailMappingTests
{
    [Fact]
    public void Maps_APPDETAILS_read_only_with_its_seven_columns()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseOracle("User Id=model;Password=model;Data Source=localhost:1521/model").Options;
        using var db = new AppDbContext(options);
        var entity = db.GetService<IDesignTimeModel>().Model.FindEntityType(typeof(AppDetail))!;
        var store = StoreObjectIdentifier.Table("APPDETAILS", null);

        Assert.Equal("APPDETAILS", entity.GetTableName());
        (string Property, string Column, int Length, bool Fixed)[] expected =
        [
            (nameof(AppDetail.Id), "USER_APPID", 80, false),
            (nameof(AppDetail.UserCode), "USER_CODE", 30, false),
            (nameof(AppDetail.Password), "USER_PASSWORD", 100, false),
            (nameof(AppDetail.CompanyCode), "USER_COMPANY_CODE", 20, false),
            (nameof(AppDetail.BranchId), "USER_BRANCH_ID", 80, false),
            (nameof(AppDetail.YearId), "USER_YEAR_ID", 80, false),
            (nameof(AppDetail.LoggedOut), "USER_LOGGED_OUT", 1, true),
        ];
        Assert.Equal(expected.Length, entity.GetProperties().Count());
        foreach (var (property, column, length, isFixed) in expected)
        {
            var p = entity.FindProperty(property)!;
            Assert.Equal(column, p.GetColumnName(store));
            Assert.Equal(length, p.GetMaxLength());
            Assert.Equal(isFixed, p.IsFixedLength() ?? false);
        }
        Assert.Equal(ValueGenerated.Never, entity.FindPrimaryKey()!.Properties.Single().ValueGenerated);
    }
}
