using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using iErp.Reports.BranchList;
using iErp.Reports.CompanyList;
using iErp.SharedBusiness.Holidays;

namespace iErp.Reports;

/// <summary>The Reports module's registration entry point. Api calls it once.</summary>
public static class ReportsRegistration
{
    public static IServiceCollection AddReports(this IServiceCollection services)
    {
        services.AddValidatorsFromAssemblyContaining(typeof(ReportsRegistration));
        services.AddScoped<ICompanyListRepository, CompanyListRepository>();
        services.AddScoped<ICompanyListService, CompanyListService>();
        services.AddScoped<IBranchListRepository, BranchListRepository>();
        services.AddScoped<IBranchListService, BranchListService>();
        services.TryAddSingleton<IHolidayFileStore, HolidayFileStore>();
        return services;
    }
}
