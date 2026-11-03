using System.Text;
using iErp.Shared.Auth;
using iErp.SharedBusiness.Holidays;

namespace iErp.Admin.HolidayList;

/// <summary>What an upload did: saved under <see cref="FileName"/>, refused with <see cref="Message"/>, or the file exists.</summary>
public record HolidayUploadResult(HolidayUploadOutcome Outcome, string? FileName = null, string? Message = null);

public enum HolidayUploadOutcome
{
    Saved,
    /// <summary>The file breaks a rule; <see cref="HolidayUploadResult.Message"/> says which.</summary>
    Invalid,
    /// <summary>A file of that name exists and replacing it was not asked for; nothing was written.</summary>
    Exists,
}

public interface IHolidayUploadService
{
    /// <summary>Checks an uploaded holiday file and saves it in the holiday folder (admin-list-upload design D4).</summary>
    Task<HolidayUploadResult> UploadAsync(string? fileName, byte[]? content, bool replace, CancellationToken ct = default);
}

/// <summary>
/// Checks an uploaded holiday file in a fixed order: present, not empty, at most 100 KB, UTF-8 text, then a name of the
/// session's company naming one of its branches and years. It is saved under the codes as the database writes them,
/// so the Holiday List reads it by the usual rule. The rights are checked before this, by the controller.
/// </summary>
public class HolidayUploadService(IHolidayListRepository repository, IHolidayFileStore files, ICurrentSession current)
    : IHolidayUploadService
{
    public const int MaxBytes = 100 * 1024;
    public const string NoFileMessage = "Choose a holiday list file to upload.";
    public const string EmptyMessage = "The holiday list file is empty.";
    public const string TooLargeMessage = "The holiday list file must be at most 100 KB.";
    public const string NotTextMessage = "The holiday list file must be UTF-8 text.";
    public const string NameMessage =
        "The file name must be <company code>-<branch code>-<year code>.txt, for example CPL-COKSF-2026.txt.";

    private static readonly UTF8Encoding StrictUtf8 = new(encoderShouldEmitUTF8Identifier: false, throwOnInvalidBytes: true);

    public static string ExistsMessage(string fileName) => $"A holiday list named {fileName} already exists.";

    public async Task<HolidayUploadResult> UploadAsync(string? fileName, byte[]? content, bool replace, CancellationToken ct = default)
    {
        if (content is null || string.IsNullOrWhiteSpace(fileName))
            return Invalid(NoFileMessage);
        if (content.Length == 0)
            return Invalid(EmptyMessage);
        if (content.Length > MaxBytes)
            return Invalid(TooLargeMessage);
        if (!IsUtf8(content))
            return Invalid(NotTextMessage);

        var name = await SavedNameAsync(fileName, ct);
        if (name is null)
            return Invalid(NameMessage);

        return files.Write(name, content, replace) switch
        {
            HolidayFileWrite.Written => new HolidayUploadResult(HolidayUploadOutcome.Saved, name),
            HolidayFileWrite.Exists => new HolidayUploadResult(HolidayUploadOutcome.Exists, name, ExistsMessage(name)),
            // A name that passed the rule is refused only without a configured folder: a setup fault, not the user's.
            _ => throw new InvalidOperationException("The holiday list folder is not configured."),
        };
    }

    /// <summary>The name to save under, rebuilt from the database's codes, or null when the name breaks the rule.</summary>
    private async Task<string?> SavedNameAsync(string fileName, CancellationToken ct)
    {
        var companyCode = current.CompanyCode?.Trim();
        var companyId = current.CompanyId?.Trim();
        if (string.IsNullOrEmpty(companyCode) || string.IsNullOrEmpty(companyId))
            return null;
        if (HolidayFiles.Parse(fileName, companyCode) is not var (branchCode, yearCode))
            return null;

        var branch = await repository.FindCompanyBranchByCodeAsync(companyId, branchCode, ct);
        var year = branch is null ? null : await repository.FindCompanyYearByCodeAsync(companyCode, yearCode, ct);
        return year is null ? null : HolidayFiles.NameFor(companyCode, branch!.Code, year.Code);
    }

    private static bool IsUtf8(byte[] content)
    {
        try
        {
            StrictUtf8.GetString(content);
            return true;
        }
        catch (DecoderFallbackException)
        {
            return false;
        }
    }

    private static HolidayUploadResult Invalid(string message) => new(HolidayUploadOutcome.Invalid, Message: message);
}
