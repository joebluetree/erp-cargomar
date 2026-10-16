using Microsoft.Extensions.Options;
using NSubstitute;
using iErp.Admin.EmployeeProfile;

namespace iErp.Tests.Admin;

/// <summary>The photo lookup on a temporary folder: only bare file names, inside the folder, of an image type.</summary>
public sealed class EmployeePhotoStoreTests : IDisposable
{
    private readonly string root = Directory.CreateTempSubdirectory("ierp-photos-").FullName;
    private readonly string photos;

    public EmployeePhotoStoreTests()
    {
        photos = Directory.CreateDirectory(Path.Combine(root, "images")).FullName;
        File.WriteAllBytes(Path.Combine(photos, "1590.jpg"), [0xFF, 0xD8, 0xFF]);
        File.WriteAllBytes(Path.Combine(photos, "asha.JPEG"), [0xFF, 0xD8, 0xFF]);
        File.WriteAllBytes(Path.Combine(photos, "logo.png"), [0x89, 0x50]);
        File.WriteAllText(Path.Combine(photos, "notes.txt"), "not a photo");
        // A file next to the folder, which a stored "..\" name must never reach.
        File.WriteAllBytes(Path.Combine(root, "secret.jpg"), [0xFF, 0xD8]);
    }

    public void Dispose() => Directory.Delete(root, recursive: true);

    private static EmployeePhotoStore StoreFor(string folder)
    {
        var options = Substitute.For<IOptionsMonitor<EmployeeImagesOptions>>();
        options.CurrentValue.Returns(new EmployeeImagesOptions { Folder = folder });
        return new EmployeePhotoStore(options);
    }

    [Theory]
    [InlineData("1590.jpg", "1590.jpg", "image/jpeg")]
    [InlineData(" 1590.jpg ", "1590.jpg", "image/jpeg")]
    [InlineData("asha.JPEG", "asha.JPEG", "image/jpeg")]
    [InlineData("logo.png", "logo.png", "image/png")]
    public void Finds_an_image_file_in_the_folder(string imageName, string file, string contentType)
    {
        var photo = StoreFor(photos).Find(imageName);

        Assert.Equal(new EmployeePhoto(Path.Combine(photos, file), contentType), photo);
    }

    [Fact]
    public void Works_with_or_without_a_trailing_separator_on_the_folder()
    {
        Assert.NotNull(StoreFor(photos + Path.DirectorySeparatorChar).Find("1590.jpg"));
        Assert.NotNull(StoreFor(photos.TrimEnd(Path.DirectorySeparatorChar)).Find("1590.jpg"));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("missing.jpg")]
    [InlineData("notes.txt")]
    [InlineData("1590")]
    public void Finds_nothing_without_an_image_file(string? imageName)
    {
        Assert.Null(StoreFor(photos).Find(imageName));
    }

    [Theory]
    [InlineData(@"..\secret.jpg")]
    [InlineData("../secret.jpg")]
    [InlineData(@"C:\Windows\secret.jpg")]
    public void Uses_only_the_bare_file_name_so_nothing_outside_the_folder_is_read(string imageName)
    {
        // "secret.jpg" exists next to the folder but not inside it.
        Assert.Null(StoreFor(photos).Find(imageName));
        Assert.True(File.Exists(Path.Combine(root, "secret.jpg")));
    }

    [Fact]
    public void A_directory_part_is_dropped_and_the_file_looked_up_in_the_folder()
    {
        Assert.Equal(Path.Combine(photos, "1590.jpg"), StoreFor(photos).Find(@"..\other\1590.jpg")!.Path);
    }

    [Fact]
    public void Reads_the_folder_from_the_current_settings()
    {
        var other = Directory.CreateDirectory(Path.Combine(root, "moved")).FullName;
        File.WriteAllBytes(Path.Combine(other, "1590.jpg"), [0xFF, 0xD8]);

        Assert.Equal(Path.Combine(other, "1590.jpg"), StoreFor(other).Find("1590.jpg")!.Path);
    }

    [Fact]
    public void Finds_nothing_when_no_folder_is_set()
    {
        Assert.Null(StoreFor("").Find("1590.jpg"));
    }
}
