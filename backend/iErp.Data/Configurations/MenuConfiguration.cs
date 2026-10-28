using iErp.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace iErp.Data.Configurations;

/// <summary>
/// Maps the existing <c>MENUM</c>, <c>MODULEM</c> and <c>USERRIGHTS</c> tables read-only. They are excluded from
/// migrations, so migrations never create, alter or drop them. Only the columns the menu and the rights check need are
/// mapped; the flags stay "Y"/"N" strings, so queries hold no bool literal (Oracle 10g).
/// </summary>
public class MenuConfiguration : IEntityTypeConfiguration<Menu>
{
    public void Configure(EntityTypeBuilder<Menu> builder)
    {
        builder.ToTable("MENUM");
        builder.HasKey(m => m.Id);

        builder.Property(m => m.Id).HasColumnName("MENU_PKID").HasMaxLength(80).ValueGeneratedNever();
        builder.Property(m => m.CompanyCode).HasColumnName("REC_COMPANY_CODE").HasMaxLength(20);
        builder.Property(m => m.ModuleId).HasColumnName("MENU_MODULE_ID").HasMaxLength(80);
        builder.Property(m => m.Code).HasColumnName("MENU_CODE").HasMaxLength(80);
        builder.Property(m => m.Name).HasColumnName("MENU_NAME").HasMaxLength(120);
        builder.Property(m => m.Route).HasColumnName("MENU_ROUTE1").HasMaxLength(200);
        builder.Property(m => m.Order).HasColumnName("MENU_ORDER");
        builder.Property(m => m.NewSoftware).HasColumnName("MENU_NEWSOFTWARE").HasMaxLength(1).IsFixedLength();
    }
}

public class MenuModuleConfiguration : IEntityTypeConfiguration<MenuModule>
{
    public void Configure(EntityTypeBuilder<MenuModule> builder)
    {
        builder.ToTable("MODULEM");
        builder.HasKey(m => m.Id);

        builder.Property(m => m.Id).HasColumnName("MODULE_PKID").HasMaxLength(80).ValueGeneratedNever();
        builder.Property(m => m.CompanyCode).HasColumnName("REC_COMPANY_CODE").HasMaxLength(30);
        builder.Property(m => m.Name).HasColumnName("MODULE_NAME").HasMaxLength(120);
        builder.Property(m => m.Order).HasColumnName("MODULE_ORDER");
    }
}

public class UserRightConfiguration : IEntityTypeConfiguration<UserRight>
{
    public void Configure(EntityTypeBuilder<UserRight> builder)
    {
        builder.ToTable("USERRIGHTS");
        builder.HasKey(r => r.Id);

        builder.Property(r => r.Id).HasColumnName("RIGHTS_PKID").HasMaxLength(80).ValueGeneratedNever();
        builder.Property(r => r.BranchId).HasColumnName("RIGHTS_BRANCH_ID").HasMaxLength(80);
        builder.Property(r => r.UserId).HasColumnName("RIGHTS_USER_ID").HasMaxLength(80);
        builder.Property(r => r.MenuId).HasColumnName("RIGHTS_MENU_ID").HasMaxLength(80);
        builder.Property(r => r.View).HasColumnName("RIGHTS_VIEW").HasMaxLength(1).IsFixedLength();
        builder.Property(r => r.Add).HasColumnName("RIGHTS_ADD").HasMaxLength(1).IsFixedLength();
        builder.Property(r => r.Edit).HasColumnName("RIGHTS_EDIT").HasMaxLength(1).IsFixedLength();
        builder.Property(r => r.Delete).HasColumnName("RIGHTS_DELETE").HasMaxLength(1).IsFixedLength();
        builder.Property(r => r.Print).HasColumnName("RIGHTS_PRINT").HasMaxLength(1).IsFixedLength();
        builder.Property(r => r.Email).HasColumnName("RIGHTS_EMAIL").HasMaxLength(1).IsFixedLength();
        builder.Property(r => r.Docs).HasColumnName("RIGHTS_DOCS").HasMaxLength(1).IsFixedLength();
        builder.Property(r => r.DocsUpload).HasColumnName("RIGHTS_DOCS_UPLOAD").HasMaxLength(1).IsFixedLength();
        builder.Property(r => r.Admin).HasColumnName("RIGHTS_ADMIN").HasMaxLength(1).IsFixedLength();
    }
}
