using Microsoft.Extensions.Options;

namespace iErp.Admin.EmployeeProfile;

/// <summary>An employee photo file: its full path and its image content type.</summary>
public record EmployeePhoto(string Path, string ContentType);

/// <summary>Finds an employee's photo file in the configured folder (design D7).</summary>
public interface IEmployeePhotoStore
{
    /// <summary>The photo named by <paramref name="imageName"/> (<c>EMP_IMAGE_NAME</c>), or null when there is none.</summary>
    EmployeePhoto? Find(string? imageName);
}

/// <summary>
/// Looks a photo up by its stored file name in <see cref="EmployeeImagesOptions.Folder"/>. Only the bare file name is
/// used and the result must stay inside the folder, so a stored name can never point at another file; only
/// <c>.jpg</c>, <c>.jpeg</c> and <c>.png</c> files are photos. The folder is read on every call, so a changed setting
/// applies without a restart.
/// </summary>
public class EmployeePhotoStore(IOptionsMonitor<EmployeeImagesOptions> options) : IEmployeePhotoStore
{
    private static readonly Dictionary<string, string> ContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        [".jpg"] = "image/jpeg",
        [".jpeg"] = "image/jpeg",
        [".png"] = "image/png",
    };

    public EmployeePhoto? Find(string? imageName)
    {
        var folder = options.CurrentValue.Folder?.Trim();
        var fileName = Path.GetFileName(imageName?.Trim() ?? "");
        if (string.IsNullOrEmpty(folder) || string.IsNullOrEmpty(fileName))
            return null;
        if (!ContentTypes.TryGetValue(Path.GetExtension(fileName), out var contentType))
            return null;

        var root = Path.GetFullPath(folder);
        if (!Path.EndsInDirectorySeparator(root))
            root += Path.DirectorySeparatorChar;
        var path = Path.GetFullPath(Path.Combine(root, fileName));
        if (!path.StartsWith(root, StringComparison.OrdinalIgnoreCase) || !File.Exists(path))
            return null;

        return new EmployeePhoto(path, contentType);
    }
}
