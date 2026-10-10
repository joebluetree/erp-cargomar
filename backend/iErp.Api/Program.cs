using iErp.Api.Middleware;
using iErp.Data;
using iErp.ModuleTemplate;
using iErp.Reports;
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

builder.Services.AddControllers(o => o.Filters.Add<ValidationFilter>())
    .AddApplicationPart(typeof(ModuleTemplateRegistration).Assembly)
    .AddApplicationPart(typeof(ReportsRegistration).Assembly);
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseExceptionHandler();
app.UseSerilogRequestLogging();

if (!app.Environment.IsProduction())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapControllers();
app.Run();

public partial class Program;
