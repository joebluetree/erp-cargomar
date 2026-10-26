using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using iErp.Data;
using iErp.Entities;

namespace iErp.Tests.Unit;

/// <summary>The read-only MENUM, MODULEM and USERRIGHTS mappings, checked on the model only (no database is opened).</summary>
public class MenuMappingTests
{
    private static IEntityType Entity<T>()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseOracle("User Id=model;Password=model;Data Source=localhost:1521/model").Options;
        var db = new AppDbContext(options);
        return db.GetService<IDesignTimeModel>().Model.FindEntityType(typeof(T))!;
    }

    private static void AssertColumns(IEntityType entity, string table, (string Property, string Column, int? Length, bool Fixed)[] expected)
    {
        var store = StoreObjectIdentifier.Table(table, null);
        Assert.Equal(table, entity.GetTableName());
        Assert.True(entity.IsTableExcludedFromMigrations());
        Assert.Equal(expected.Length, entity.GetProperties().Count());
        foreach (var (property, column, length, isFixed) in expected)
        {
            var p = entity.FindProperty(property)!;
            Assert.Equal(column, p.GetColumnName(store));
            Assert.Equal(length, p.GetMaxLength());
            Assert.Equal(isFixed, p.IsFixedLength() ?? false);
        }
    }

    [Fact]
    public void Menu_maps_MENUM_read_only()
    {
        var entity = Entity<Menu>();
        AssertColumns(entity, "MENUM",
        [
            (nameof(Menu.Id), "MENU_PKID", 80, false),
            (nameof(Menu.CompanyCode), "REC_COMPANY_CODE", 20, false),
            (nameof(Menu.ModuleId), "MENU_MODULE_ID", 80, false),
            (nameof(Menu.Code), "MENU_CODE", 80, false),
            (nameof(Menu.Name), "MENU_NAME", 120, false),
            (nameof(Menu.Route), "MENU_ROUTE1", 200, false),
            (nameof(Menu.Order), "MENU_ORDER", null, false),
            (nameof(Menu.NewSoftware), "MENU_NEWSOFTWARE", 1, true),
        ]);
        Assert.Equal(ValueGenerated.Never, entity.FindPrimaryKey()!.Properties.Single().ValueGenerated);
    }

    [Fact]
    public void MenuModule_maps_MODULEM_read_only()
    {
        AssertColumns(Entity<MenuModule>(), "MODULEM",
        [
            (nameof(MenuModule.Id), "MODULE_PKID", 80, false),
            (nameof(MenuModule.CompanyCode), "REC_COMPANY_CODE", 30, false),
            (nameof(MenuModule.Name), "MODULE_NAME", 120, false),
            (nameof(MenuModule.Order), "MODULE_ORDER", null, false),
        ]);
    }

    [Fact]
    public void UserRight_maps_USERRIGHTS_read_only_with_one_character_flags()
    {
        AssertColumns(Entity<UserRight>(), "USERRIGHTS",
        [
            (nameof(UserRight.Id), "RIGHTS_PKID", 80, false),
            (nameof(UserRight.BranchId), "RIGHTS_BRANCH_ID", 80, false),
            (nameof(UserRight.UserId), "RIGHTS_USER_ID", 80, false),
            (nameof(UserRight.MenuId), "RIGHTS_MENU_ID", 80, false),
            (nameof(UserRight.View), "RIGHTS_VIEW", 1, true),
            (nameof(UserRight.Add), "RIGHTS_ADD", 1, true),
            (nameof(UserRight.Edit), "RIGHTS_EDIT", 1, true),
            (nameof(UserRight.Delete), "RIGHTS_DELETE", 1, true),
            (nameof(UserRight.Print), "RIGHTS_PRINT", 1, true),
            (nameof(UserRight.Email), "RIGHTS_EMAIL", 1, true),
            (nameof(UserRight.Docs), "RIGHTS_DOCS", 1, true),
            (nameof(UserRight.DocsUpload), "RIGHTS_DOCS_UPLOAD", 1, true),
            (nameof(UserRight.Admin), "RIGHTS_ADMIN", 1, true),
        ]);
    }
}
