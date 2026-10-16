using System.Security.Cryptography;
using iErp.Shared.Lib;

namespace iErp.Tests.Unit;

/// <summary>
/// The legacy password encryption. The expected values were produced by the legacy algorithm (DES, key and IV
/// "ZeroCool"), the same one that every stored <c>USERM.USER_PASSWORD</c> in the dev data round-trips with.
/// </summary>
public class LibTests
{
    [Theory]
    [InlineData("secret", "dMM1ZkoWpuE=")]
    [InlineData("Pass@123", "N7oAfk9YOhK3iROAcd3a4A==")]
    public void Encrypt_gives_the_legacy_value(string plain, string encrypted)
    {
        Assert.Equal(encrypted, Lib.Encrypt(plain));
    }

    [Theory]
    [InlineData("dMM1ZkoWpuE=", "secret")]
    [InlineData("N7oAfk9YOhK3iROAcd3a4A==", "Pass@123")]
    public void Decrypt_gives_the_original_text(string encrypted, string plain)
    {
        Assert.Equal(plain, Lib.Decrypt(encrypted));
    }

    [Theory]
    [InlineData("a")]
    [InlineData("exactly8")]
    [InlineData("a longer password with spaces and ünïcödé")]
    public void Decrypt_reverses_Encrypt(string plain)
    {
        Assert.Equal(plain, Lib.Decrypt(Lib.Encrypt(plain)));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public void Empty_values_give_an_empty_text(string? value)
    {
        Assert.Equal("", Lib.Encrypt(value));
        Assert.Equal("", Lib.Decrypt(value));
    }

    [Fact]
    public void Decrypt_rejects_a_value_that_is_not_encrypted()
    {
        Assert.Throws<FormatException>(() => Lib.Decrypt("not base64!"));
        Assert.ThrowsAny<CryptographicException>(() => Lib.Decrypt("AAAAAAAAAAA="));
    }
}
