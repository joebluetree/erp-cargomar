using System.Text;
using Microsoft.Extensions.Options;
using NSubstitute;
using iErp.SharedBusiness.Holidays;

namespace iErp.Tests.Admin;

/// <summary>The holiday file lookup on a temporary folder: only bare .txt names, inside the folder, read as UTF-8.</summary>
public sealed class HolidayFileStoreTests : IDisposable
{
    private readonly string root = Directory.CreateTempSubdirectory("ierp-holidays-").FullName;
    private readonly string folder;

    public HolidayFileStoreTests()
    {
        folder = Directory.CreateDirectory(Path.Combine(root, "Holiday List")).FullName;
        File.WriteAllText(Path.Combine(folder, "CPL-COKSF-2026.txt"), "Republic Day, 26-01-2026\nOnam, 26-08-2026\n", new UTF8Encoding(false));
        File.WriteAllText(Path.Combine(folder, "CPL-TVMSF-2026.txt"), "Thiruvonam, 26-08-2026", new UTF8Encoding(true));
        File.WriteAllText(Path.Combine(folder, "CPL-COKSF-2026.csv"), "not a holiday file");
        // A file next to the folder, which a name with a path must never reach.
        File.WriteAllText(Path.Combine(root, "secret.txt"), "secret");
    }

    public void Dispose() => Directory.Delete(root, recursive: true);

    private static (HolidayFileStore Store, IOptionsMonitor<HolidayListsOptions> Options) StoreFor(string folder)
    {
        var options = Substitute.For<IOptionsMonitor<HolidayListsOptions>>();
        options.CurrentValue.Returns(new HolidayListsOptions { Folder = folder });
        return (new HolidayFileStore(options), options);
    }

    [Fact]
    public void Reads_the_lines_of_the_named_file()
    {
        Assert.Equal(["Republic Day, 26-01-2026", "Onam, 26-08-2026"], StoreFor(folder).Store.Read("CPL-COKSF-2026.txt"));
    }

    [Fact]
    public void A_byte_order_mark_is_not_part_of_the_first_line()
    {
        Assert.Equal(["Thiruvonam, 26-08-2026"], StoreFor(folder).Store.Read("CPL-TVMSF-2026.txt"));
    }

    [Theory]
    [InlineData("CPL-COKSF-2025.txt")]
    [InlineData("CPL-COKSF-2026.csv")]
    [InlineData(@"..\secret.txt")]
    [InlineData("../secret.txt")]
    [InlineData("")]
    public void Anything_else_is_no_file(string fileName)
    {
        Assert.Null(StoreFor(folder).Store.Read(fileName));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Without_a_folder_there_is_no_file(string configured)
    {
        Assert.Null(StoreFor(configured).Store.Read("CPL-COKSF-2026.txt"));
    }

    [Fact]
    public void A_changed_folder_applies_on_the_next_read()
    {
        var other = Directory.CreateDirectory(Path.Combine(root, "other")).FullName;
        File.WriteAllText(Path.Combine(other, "CPL-COKSF-2026.txt"), "Other, 01-01-2026");
        var (store, options) = StoreFor(folder);
        Assert.Equal(2, store.Read("CPL-COKSF-2026.txt")!.Count);

        options.CurrentValue.Returns(new HolidayListsOptions { Folder = other });

        Assert.Equal(["Other, 01-01-2026"], store.Read("CPL-COKSF-2026.txt"));
    }
}
