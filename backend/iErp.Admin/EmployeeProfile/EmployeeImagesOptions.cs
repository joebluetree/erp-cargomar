namespace iErp.Admin.EmployeeProfile;

/// <summary>
/// Where the employee photos are (configuration section <c>EmployeeImages</c>). The folder is set in
/// <c>appsettings.json</c> and can be changed there, in an environment's own settings file or with the
/// <c>EmployeeImages__Folder</c> environment variable when the photos move. A photo is the file named by
/// <c>EMPM.EMP_IMAGE_NAME</c> in this folder.
/// </summary>
public class EmployeeImagesOptions
{
    public const string SectionName = "EmployeeImages";

    public string Folder { get; set; } = "";
}
