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

/// <summary>Reads a holiday file from the configured folder (admin-holiday-list design D1).</summary>
public interface IHolidayFileStore
{
    /// <summary>The lines of the file named <paramref name="fileName"/>, or null when there is no such file.</summary>
    IReadOnlyList<string>? Read(string fileName);
}

/// <summary>
/// Looks a holiday file up in <see cref="HolidayListsOptions.Folder"/>. Only the bare file name is used and the result
/// must stay inside the folder, so a name can never point at another file; only <c>.txt</c> files are read. The folder
/// is read on every call, so a changed setting or an edited file applies at once. Files are read as UTF-8 (a byte order
/// mark is honoured) and never written.
/// </summary>
public class HolidayFileStore(IOptionsMonitor<HolidayListsOptions> options) : IHolidayFileStore
{
    public IReadOnlyList<string>? Read(string fileName)
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
        if (!path.StartsWith(root, StringComparison.OrdinalIgnoreCase) || !File.Exists(path))
            return null;

        return File.ReadAllLines(path, Encoding.UTF8);
    }
}
