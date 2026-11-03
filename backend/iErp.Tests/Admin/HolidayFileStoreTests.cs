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

    private string[] TempFiles() => Directory.GetFiles(folder, "*.tmp");

    [Fact]
    public void A_new_file_is_written_byte_for_byte()
    {
        byte[] content = [0xEF, 0xBB, 0xBF, .. Encoding.UTF8.GetBytes("Onam,Wednesday,26-08-2026\r\n")];

        var result = StoreFor(folder).Store.Write("CPL-MAASF-2026.txt", content, replace: false);

        Assert.Equal(HolidayFileWrite.Written, result);
        Assert.Equal(content, File.ReadAllBytes(Path.Combine(folder, "CPL-MAASF-2026.txt")));
        Assert.True(StoreFor(folder).Store.Exists("CPL-MAASF-2026.txt"));
        Assert.Empty(TempFiles());
    }

    [Fact]
    public void An_existing_file_is_kept_unless_replacing_is_asked_for()
    {
        var store = StoreFor(folder).Store;
        var path = Path.Combine(folder, "CPL-COKSF-2026.txt");
        var before = File.ReadAllBytes(path);

        Assert.Equal(HolidayFileWrite.Exists, store.Write("CPL-COKSF-2026.txt", "New,01-01-2026"u8.ToArray(), replace: false));
        Assert.Equal(before, File.ReadAllBytes(path));

        Assert.Equal(HolidayFileWrite.Written, store.Write("CPL-COKSF-2026.txt", "New,01-01-2026"u8.ToArray(), replace: true));
        Assert.Equal("New,01-01-2026"u8.ToArray(), File.ReadAllBytes(path));
        Assert.Empty(TempFiles());
    }

    [Theory]
    [InlineData(@"..\secret.txt")]
    [InlineData("../other.txt")]
    [InlineData("CPL-COKSF-2026.csv")]
    [InlineData("")]
    public void A_name_the_store_refuses_writes_nothing(string fileName)
    {
        var secret = File.ReadAllBytes(Path.Combine(root, "secret.txt"));

        Assert.Equal(HolidayFileWrite.Refused, StoreFor(folder).Store.Write(fileName, "x"u8.ToArray(), replace: true));
        Assert.Equal(secret, File.ReadAllBytes(Path.Combine(root, "secret.txt")));
        Assert.False(File.Exists(Path.Combine(root, "other.txt")));
        Assert.Equal(3, Directory.GetFiles(folder).Length);
    }

    [Fact]
    public void Without_a_folder_nothing_is_written()
    {
        Assert.Equal(HolidayFileWrite.Refused, StoreFor(" ").Store.Write("CPL-COKSF-2026.txt", "x"u8.ToArray(), replace: true));
        Assert.False(StoreFor(" ").Store.Exists("CPL-COKSF-2026.txt"));
    }
}
