using NSubstitute;
using iErp.Admin.EmployeeProfile;
using iErp.Entities;
using iErp.Shared.Auth;

namespace iErp.Tests.Admin;

public class EmployeeProfileServiceTests
{
    private static Employee Asha() => new()
    {
        Id = "e-1", Code = "EMP01", Name = " Asha Nair ", FatherName = "Ravi Nair", SpouseName = "Arun",
        MaritalStatus = "MARRIED", DateOfBirth = new DateTime(1990, 3, 5),
        BankAccountNo = "123456789", BankName = "SBI", BankBranch = "Kochi", IfscCode = "SBIN0000001",
        LocalAddress1 = "House 1", LocalAddress2 = "Road 2", LocalAddress3 = "Area 3", LocalCity = "Kochi",
        LocalStateId = "s-kl", LocalPin = "682001", LocalPoBox = "PO 1", LocalCountryId = "c-in",
        HomeAddress1 = "Home 1", HomeAddress2 = "Home 2", HomeAddress3 = "Home 3", HomeCity = "Chennai",
        HomeStateId = "s-tn", HomePin = "600001", HomePoBox = "PO 2", HomeCountryId = "c-in",
        Mobile = "9876543210", Email = "asha@example.com",
        AadhaarNo = "1234 5678 9012", Pan = "ABCDE1234F", PfNo = "PF-1", EsiNo = "ESI-1", UanNo = "UAN-1",
    };

    private static readonly Parameter[] Places =
    [
        new() { Id = "s-kl", Type = "STATE", Name = "KERALA" },
        new() { Id = "s-tn", Type = "STATE", Name = "TAMIL NADU" },
        new() { Id = "c-in", Type = "COUNTRY", Name = "INDIA" },
    ];

    private static ICurrentSession Session(string? employeeId)
    {
        var session = Substitute.For<ICurrentSession>();
        session.EmployeeId.Returns(employeeId);
        return session;
    }

    /// <summary>The photo the fake store knows: "1590.jpg" only.</summary>
    private static readonly EmployeePhoto Photo = new(@"D:\photos\1590.jpg", "image/jpeg");

    /// <summary>The session's scope in these tests: company CMP, branch KOC.</summary>
    private static readonly EmployeeScope Scope = new("CMP", "KOC");

    private static (EmployeeProfileService Service, IEmployeeProfileRepository Repository) ServiceWith(
        Employee? employee, string? employeeId = "e-1", Parameter[]? places = null, EmployeeScope? scope = null,
        bool noScope = false, Employee? inScope = null)
    {
        var repository = Substitute.For<IEmployeeProfileRepository>();
        repository.FindEmployeeAsync("e-1", Arg.Any<CancellationToken>()).Returns(employee);
        // e-9 is the one employee in the session's scope.
        repository.FindInScopeAsync("e-9", scope ?? Scope, Arg.Any<CancellationToken>()).Returns(inScope);
        repository.ListPlacesAsync(Arg.Any<IReadOnlyCollection<string>>(), Arg.Any<CancellationToken>())
            .Returns(places ?? Places);
        var photos = Substitute.For<IEmployeePhotoStore>();
        photos.Find("1590.jpg").Returns(Photo);
        var scopes = Substitute.For<IEmployeeScopeResolver>();
        scopes.ResolveAsync(Arg.Any<CancellationToken>()).Returns(noScope ? null : scope ?? Scope);
        return (new EmployeeProfileService(repository, Session(employeeId), photos, scopes), repository);
    }

    [Fact]
    public async Task The_profile_of_an_employee_in_scope_has_every_field_and_the_photo()
    {
        var other = Asha();
        other.Id = "e-9";
        other.ImageName = "1590.jpg";
        var (service, _) = ServiceWith(Asha(), inScope: other);

        var profile = (await service.GetAsync("e-9"))!;

        Assert.Equal(("EMP01", "Asha Nair"), (profile.Code, profile.Name));
        Assert.Equal(new IdNumbersDto("1234 5678 9012", "ABCDE1234F", "PF-1", "ESI-1", "UAN-1"), profile.Ids);
        Assert.Equal("KERALA", profile.CurrentAddress.State);
        Assert.True(profile.HasPhoto);
        Assert.Equal(Photo, await service.GetPhotoAsync("e-9"));
        Assert.Equal(Photo, await service.GetPhotoAsync(" e-9 "));
    }

    [Theory]
    [InlineData("e-unknown")]
    [InlineData("")]
    [InlineData("   ")]
    public async Task An_employee_outside_the_scope_is_not_found(string employeeId)
    {
        var (service, _) = ServiceWith(Asha(), inScope: Asha());

        Assert.Null(await service.GetAsync(employeeId));
        Assert.Null(await service.GetPhotoAsync(employeeId));
    }

    [Fact]
    public async Task Without_a_scope_no_employee_is_found()
    {
        var (service, repository) = ServiceWith(Asha(), noScope: true, inScope: Asha());

        Assert.Null(await service.GetAsync("e-9"));
        await repository.DidNotReceiveWithAnyArgs().FindInScopeAsync(default!, default!, default);
    }

    [Fact]
    public async Task The_own_profile_is_not_limited_by_the_scope()
    {
        var (service, _) = ServiceWith(Asha(), noScope: true);

        Assert.NotNull(await service.GetOwnAsync());
    }

    [Fact]
    public async Task Has_a_photo_when_the_store_finds_the_image_name()
    {
        var employee = Asha();
        employee.ImageName = "1590.jpg";
        var (service, _) = ServiceWith(employee);

        Assert.True((await service.GetOwnAsync())!.HasPhoto);
        Assert.Equal(Photo, await service.GetOwnPhotoAsync());
    }

    [Theory]
    [InlineData(null)]
    [InlineData("missing.jpg")]
    public async Task Has_no_photo_without_an_image_name_or_a_file(string? imageName)
    {
        var employee = Asha();
        employee.ImageName = imageName;
        var (service, _) = ServiceWith(employee);

        Assert.False((await service.GetOwnAsync())!.HasPhoto);
        Assert.Null(await service.GetOwnPhotoAsync());
    }

    [Fact]
    public async Task No_photo_without_an_employee()
    {
        var (withoutId, _) = ServiceWith(Asha(), employeeId: null);
        var (missing, _) = ServiceWith(employee: null);

        Assert.Null(await withoutId.GetOwnPhotoAsync());
        Assert.Null(await missing.GetOwnPhotoAsync());
    }

    [Fact]
    public async Task Maps_every_field_of_the_session_employee()
    {
        var (service, _) = ServiceWith(Asha());

        var profile = (await service.GetOwnAsync())!;

        Assert.Equal(("EMP01", "Asha Nair", "Ravi Nair", "Arun", "MARRIED"),
            (profile.Code, profile.Name, profile.FatherName, profile.SpouseName, profile.MaritalStatus));
        Assert.Equal(new DateOnly(1990, 3, 5), profile.DateOfBirth);
        Assert.Equal(new BankDetailsDto("123456789", "SBI", "Kochi", "SBIN0000001"), profile.Bank);
        Assert.Equal(new AddressDto("House 1", "Road 2", "Area 3", "Kochi", "KERALA", "682001", "PO 1", "INDIA"), profile.CurrentAddress);
        Assert.Equal(new AddressDto("Home 1", "Home 2", "Home 3", "Chennai", "TAMIL NADU", "600001", "PO 2", "INDIA"), profile.PermanentAddress);
        Assert.Equal(("9876543210", "asha@example.com"), (profile.Mobile, profile.Email));
        Assert.Equal(new IdNumbersDto("1234 5678 9012", "ABCDE1234F", "PF-1", "ESI-1", "UAN-1"), profile.Ids);
    }

    [Fact]
    public async Task Looks_up_the_place_names_once_for_the_distinct_ids()
    {
        var (service, repository) = ServiceWith(Asha());

        await service.GetOwnAsync();

        await repository.Received(1).ListPlacesAsync(
            Arg.Is<IReadOnlyCollection<string>>(ids => ids!.Order().SequenceEqual(new[] { "c-in", "s-kl", "s-tn" })),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task An_unknown_place_id_or_a_parameter_of_the_other_type_gives_no_name()
    {
        var employee = Asha();
        employee.HomeStateId = "s-unknown";
        employee.LocalCountryId = "s-kl"; // a state id where a country is expected
        var (service, _) = ServiceWith(employee);

        var profile = (await service.GetOwnAsync())!;

        Assert.Null(profile.PermanentAddress.State);
        Assert.Null(profile.CurrentAddress.Country);
        Assert.Equal("KERALA", profile.CurrentAddress.State);
    }

    [Fact]
    public async Task Empty_fields_stay_empty()
    {
        var employee = new Employee { Id = "e-1", Name = "Asha Nair", SpouseName = "  " };
        var (service, repository) = ServiceWith(employee);

        var profile = (await service.GetOwnAsync())!;

        Assert.Null(profile.SpouseName);
        Assert.Null(profile.DateOfBirth);
        Assert.Equal(new BankDetailsDto(null, null, null, null), profile.Bank);
        Assert.Equal(new AddressDto(null, null, null, null, null, null, null, null), profile.CurrentAddress);
        await repository.Received(1).ListPlacesAsync(
            Arg.Is<IReadOnlyCollection<string>>(ids => ids!.Count == 0), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task The_employee_id_is_trimmed()
    {
        var (service, _) = ServiceWith(Asha(), employeeId: " e-1 ");

        Assert.NotNull(await service.GetOwnAsync());
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task No_employee_id_gives_no_profile_without_reading_the_database(string? employeeId)
    {
        var (service, repository) = ServiceWith(Asha(), employeeId);

        Assert.Null(await service.GetOwnAsync());
        await repository.DidNotReceiveWithAnyArgs().FindEmployeeAsync(default!, default);
    }

    [Fact]
    public async Task A_missing_employee_gives_no_profile()
    {
        var (service, repository) = ServiceWith(employee: null);

        Assert.Null(await service.GetOwnAsync());
        await repository.DidNotReceiveWithAnyArgs().ListPlacesAsync(default!, default);
    }
}
