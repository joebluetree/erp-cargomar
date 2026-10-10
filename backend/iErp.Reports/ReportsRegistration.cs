using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using iErp.Reports.CompanyList;

namespace iErp.Reports;

/// <summary>The Reports module's registration entry point. Api calls it once.</summary>
public static class ReportsRegistration
{
    public static IServiceCollection AddReports(this IServiceCollection services)
    {
        services.AddValidatorsFromAssemblyContaining(typeof(ReportsRegistration));
        services.AddScoped<ICompanyListRepository, CompanyListRepository>();
        services.AddScoped<ICompanyListService, CompanyListService>();
        return services;
    }
}
