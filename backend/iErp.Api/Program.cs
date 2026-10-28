using System.Text;
using iErp.Admin;
using iErp.Admin.EmployeeProfile;
using iErp.SharedBusiness.Holidays;
using iErp.Api.Auth;
using iErp.Api.Middleware;
using iErp.Data;
using iErp.ModuleTemplate;
using iErp.Reports;
using iErp.Shared.Auth;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.OpenApi;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Optional machine-local settings (for example the Oracle connection string). The file is Git-ignored
// (appsettings.*.local.json). Environment variables are added again afterwards so they still win.
builder.Configuration
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.local.json", optional: true, reloadOnChange: true)
    .AddEnvironmentVariables();

builder.Host.UseSerilog((context, services, logger) => logger
    .ReadFrom.Configuration(context.Configuration)
    .ReadFrom.Services(services)
    .Enrich.FromLogContext());

builder.Services.AddData(builder.Configuration);
builder.Services.AddModuleTemplate();
builder.Services.AddReports();
builder.Services.AddAdmin();

// Access tokens: issued by the Admin login, required by every controller endpoint (see MapControllers). The signing
// key comes from user secrets, the local settings file or the environment; the API does not start without it.
builder.Services.AddOptions<JwtOptions>()
    .Bind(builder.Configuration.GetSection(JwtOptions.SectionName))
    .Validate(o => Encoding.UTF8.GetByteCount(o.SigningKey) >= JwtOptions.MinSigningKeyBytes,
        $"Jwt:SigningKey must be set to a secret of at least {JwtOptions.MinSigningKeyBytes} bytes.")
    .Validate(o => o.LifetimeMinutes > 0, "Jwt:LifetimeMinutes must be greater than 0.")
    .ValidateOnStart();
// Employee photos: the folder is set in appsettings.json (EmployeeImages:Folder) and may be changed without a code change.
builder.Services.AddOptions<EmployeeImagesOptions>().Bind(builder.Configuration.GetSection(EmployeeImagesOptions.SectionName));
// Branch holiday files: the folder is set in appsettings.json (HolidayLists:Folder) and may be changed without a code change.
builder.Services.AddOptions<HolidayListsOptions>().Bind(builder.Configuration.GetSection(HolidayListsOptions.SectionName));
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();
builder.Services.ConfigureOptions<ConfigureJwtBearer>();
builder.Services.AddAuthorization();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentSession, HttpCurrentSession>();

builder.Services.AddControllers(o => o.Filters.Add<ValidationFilter>())
    .AddApplicationPart(typeof(ModuleTemplateRegistration).Assembly)
    .AddApplicationPart(typeof(ReportsRegistration).Assembly)
    .AddApplicationPart(typeof(AdminRegistration).Assembly);
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(o =>
{
    // Lets developers paste the token from POST /api/admin/login into the Swagger UI.
    o.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description = "The token returned by POST /api/admin/login.",
    });
    o.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference("Bearer", document)] = [],
    });
});

var app = builder.Build();

app.UseExceptionHandler();
app.UseSerilogRequestLogging();

if (!app.Environment.IsProduction())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// The published Angular app lives in wwwroot and is served from the same origin as the API.
app.UseDefaultFiles();
app.UseStaticFiles();
// Routing is added explicitly, after the static files, so the endpoints can be placed before the Angular fallback below.
app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();
// Every controller action requires a valid token unless it is marked [AllowAnonymous] (only the login is).
// Applied here rather than as a fallback policy, so a wrong HTTP method still answers 405, not 401.
// UseEndpoints is explicit on purpose: top-level MapControllers would run last, after the Angular fallback below.
#pragma warning disable ASP0014
app.UseEndpoints(endpoints => endpoints.MapControllers().RequireAuthorization());
#pragma warning restore ASP0014

// Angular client-side routes load index.html. This runs only for requests no endpoint handled, and only for GET/HEAD
// outside /api without a file extension, so a wrong method on an API route still answers 405 and a missing .js or .css
// file answers 404 instead of HTML.
app.Use((context, next) =>
{
    var path = context.Request.Path;
    if ((HttpMethods.IsGet(context.Request.Method) || HttpMethods.IsHead(context.Request.Method))
        && !path.StartsWithSegments("/api") && !Path.HasExtension(path.Value))
        context.Request.Path = "/index.html";
    return next();
});
app.UseStaticFiles();
app.Run();

public partial class Program;
