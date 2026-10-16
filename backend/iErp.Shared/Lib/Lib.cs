using System.Security.Cryptography;
using System.Text;

namespace iErp.Shared.Lib;

/// <summary>
/// Helpers shared with the legacy ERP. <see cref="Encrypt"/> and <see cref="Decrypt"/> reproduce the legacy system's
/// password encryption exactly (DES, CBC, PKCS7 padding, key and IV "ZeroCool", UTF-8 text, Base64 output), so values
/// written by either system match: every <c>USERM.USER_PASSWORD</c> in the dev data decrypts with them and re-encrypts
/// to the same text. The login encrypts the typed password and compares it with the stored one.
/// <para>
/// DES with a fixed key is weak by today's standards; it is kept only because the existing data uses it.
/// </para>
/// </summary>
public static class Lib
{
    /// <summary>The legacy key, also used as the IV. It must not change, or stored values no longer match.</summary>
    private static readonly byte[] Key = Encoding.ASCII.GetBytes("ZeroCool");

    /// <summary>The legacy encrypted form of <paramref name="originalString"/>; "" for null or empty.</summary>
    public static string Encrypt(string? originalString)
    {
        if (string.IsNullOrEmpty(originalString))
            return "";

        using var des = DES.Create();
        using var memoryStream = new MemoryStream();
        using (var cryptoStream = new CryptoStream(memoryStream, des.CreateEncryptor(Key, Key), CryptoStreamMode.Write))
        using (var writer = new StreamWriter(cryptoStream))
        {
            writer.Write(originalString);
        }
        return Convert.ToBase64String(memoryStream.ToArray());
    }

    /// <summary>
    /// The original text of a legacy encrypted value; "" for null or empty. Throws <see cref="FormatException"/> or
    /// <see cref="CryptographicException"/> when the value is not one.
    /// </summary>
    public static string Decrypt(string? cryptedString)
    {
        if (string.IsNullOrEmpty(cryptedString))
            return "";

        using var des = DES.Create();
        using var memoryStream = new MemoryStream(Convert.FromBase64String(cryptedString));
        using var cryptoStream = new CryptoStream(memoryStream, des.CreateDecryptor(Key, Key), CryptoStreamMode.Read);
        using var reader = new StreamReader(cryptoStream);
        return reader.ReadToEnd();
    }
}
