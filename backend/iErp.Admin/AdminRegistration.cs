using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using iErp.Admin.ChangeBranch;
using iErp.Admin.EmployeeList;
using iErp.Admin.EmployeeProfile;
using iErp.Admin.HolidayList;
using iErp.Shared.Auth;
using iErp.SharedBusiness.Holidays;
using iErp.Admin.Login;
using iErp.Admin.Notification;
using iErp.Admin.Session;
using iErp.Admin.UserRights;

namespace iErp.Admin;

/// <summary>The Admin module's registration entry point. Api calls it once.</summary>
public static class AdminRegistration
{
    public static IServiceCollection AddAdmin(this IServiceCollection services)
    {
        services.AddValidatorsFromAssemblyContaining(typeof(AdminRegistration));
        services.TryAddSingleton(TimeProvider.System);
        services.AddScoped<ISessionTokenIssuer, SessionTokenIssuer>();
        services.AddScoped<ILoginRepository, LoginRepository>();
        services.AddScoped<ILoginService, LoginService>();
        services.AddScoped<IChangeBranchRepository, ChangeBranchRepository>();
        services.AddScoped<IChangeBranchService, ChangeBranchService>();
        services.AddScoped<IEmployeeProfileRepository, EmployeeProfileRepository>();
        services.AddScoped<IEmployeeProfileService, EmployeeProfileService>();
        services.AddSingleton<IEmployeePhotoStore, EmployeePhotoStore>();
        services.AddScoped<IEmployeeScopeResolver, EmployeeScopeResolver>();
        services.AddScoped<IEmployeeListRepository, EmployeeListRepository>();
        services.AddScoped<IEmployeeListService, EmployeeListService>();
        services.AddScoped<IHolidayListRepository, HolidayListRepository>();
        services.AddScoped<IHolidayListService, HolidayListService>();
        services.TryAddSingleton<IHolidayFileStore, HolidayFileStore>();
        services.AddScoped<INotificationRepository, NotificationRepository>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<IMenuRepository, MenuRepository>();
        services.AddScoped<IUserMenuService, UserMenuService>();
        services.AddScoped<IMenuAccess, MenuAccess>();
        return services;
    }
}
