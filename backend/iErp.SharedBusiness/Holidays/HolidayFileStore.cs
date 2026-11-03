using System.Text;
using Microsoft.Extensions.Options;

namespace iErp.SharedBusiness.Holidays;

/// <summary>
/// Where the branches' holiday files are (configuration section <c>HolidayLists</c>). The folder is set in
/// <c>appsettings.json</c> and can be changed there, in an environment's own settings file or with the
/// <c>HolidayLists__Folder</c> environment variable. A branch's file is <c>&lt;company&gt;-&lt;branch&gt;-&lt;year&gt;.txt</c>
/// in this folder.
/// </summary>
public class HolidayListsOptions
{
    public const string SectionName = "HolidayLists";

    public string Folder { get; set; } = "";
}

/// <summary>Reads and writes holiday files in the configured folder (admin-holiday-list design D1, admin-list-upload D3).</summary>
public interface IHolidayFileStore
{
    /// <summary>The lines of the file named <paramref name="fileName"/>, or null when there is no such file.</summary>
    IReadOnlyList<string>? Read(string fileName);

    /// <summary>True when the folder has a file with this name; false also for a name the store refuses.</summary>
    bool Exists(string fileName);

    /// <summary>
    /// Saves the bytes as the file with this name, exactly as given. Without <paramref name="replace"/> an existing file
    /// is left as it is and the answer is <see cref="HolidayFileWrite.Exists"/>. A name the store refuses, or no folder,
    /// writes nothing.
    /// </summary>
    HolidayFileWrite Write(string fileName, byte[] content, bool replace);
}

/// <summary>What a write did.</summary>
public enum HolidayFileWrite
{
    Written,
    /// <summary>The file exists and replacing it was not asked for; nothing was written.</summary>
    Exists,
    /// <summary>The name is not a bare .txt name inside the folder, or no folder is configured; nothing was written.</summary>
    Refused,
}

/// <summary>
/// Looks a holiday file up in <see cref="HolidayListsOptions.Folder"/>. Only the bare file name is used and the result
/// must stay inside the folder, so a name can never point at another file; only <c>.txt</c> files are read or written.
/// The folder is read on every call, so a changed setting or an edited file applies at once. Files are read as UTF-8 (a
/// byte order mark is honoured). A write goes to a temporary file in the folder that is then moved onto the name, so a
/// list is never half written; the temporary file starts with a dot, so it is never read as a list.
/// </summary>
public class HolidayFileStore(IOptionsMonitor<HolidayListsOptions> options) : IHolidayFileStore
{
    public IReadOnlyList<string>? Read(string fileName) =>
        PathOf(fileName) is { } path && File.Exists(path) ? File.ReadAllLines(path, Encoding.UTF8) : null;

    public bool Exists(string fileName) => PathOf(fileName) is { } path && File.Exists(path);

    public HolidayFileWrite Write(string fileName, byte[] content, bool replace)
    {
        if (PathOf(fileName) is not { } path)
            return HolidayFileWrite.Refused;
        if (!replace && File.Exists(path))
            return HolidayFileWrite.Exists;

        var temp = Path.Combine(Path.GetDirectoryName(path)!, $".{Path.GetFileName(path)}.{Guid.NewGuid():N}.tmp");
        try
        {
            File.WriteAllBytes(temp, content);
            // Atomic on one volume: the list is the old file or the new one, never part of either. Without replace, a
            // file that appeared meanwhile makes the move fail, and it is kept.
            File.Move(temp, path, overwrite: replace);
            return HolidayFileWrite.Written;
        }
        catch (IOException) when (!replace && File.Exists(path))
        {
            return HolidayFileWrite.Exists;
        }
        finally
        {
            if (File.Exists(temp))
                File.Delete(temp);
        }
    }

    /// <summary>The full path of a bare .txt name inside the folder, or null when the name or the folder is not usable.</summary>
    private string? PathOf(string fileName)
    {
        var folder = options.CurrentValue.Folder?.Trim();
        var name = Path.GetFileName(fileName.Trim());
        if (string.IsNullOrEmpty(folder) || string.IsNullOrEmpty(name) || name != fileName.Trim())
            return null;
        if (!string.Equals(Path.GetExtension(name), ".txt", StringComparison.OrdinalIgnoreCase))
            return null;

        var root = Path.GetFullPath(folder);
        if (!Path.EndsInDirectorySeparator(root))
            root += Path.DirectorySeparatorChar;
        var path = Path.GetFullPath(Path.Combine(root, name));
        return path.StartsWith(root, StringComparison.OrdinalIgnoreCase) ? path : null;
    }
}
