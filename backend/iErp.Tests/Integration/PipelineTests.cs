using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using iErp.Tests.TestSupport;

namespace iErp.Tests.Integration;

/// <summary>HTTP pipeline behaviour (validation, error format, Swagger) through test-only endpoints. No database needed.</summary>
public class PipelineTests
{
    private static HttpClient Client() => new ApiFactory().CreateClient().Authenticated();

    [Fact]
    public async Task Not_found_returns_404_problem_details_with_trace_id()
    {
        var response = await Client().GetAsync("/test-endpoints/not-found");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(404, body.GetProperty("status").GetInt32());
        Assert.True(body.TryGetProperty("traceId", out _));
    }

    [Fact]
    public async Task Unexpected_exception_returns_generic_500_without_internal_details()
    {
        var response = await Client().GetAsync("/test-endpoints/boom");

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        var text = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain(TestEndpointsController.Secret, text);
        Assert.Contains("traceId", text);
    }

    [Fact]
    public async Task Invalid_body_returns_400_with_errors_grouped_by_field()
    {
        var response = await Client().PostAsJsonAsync("/test-endpoints/echo", new { name = "" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(body.GetProperty("errors").TryGetProperty("Name", out _));
    }

    [Fact]
    public async Task Valid_body_passes_validation()
    {
        var response = await Client().PostAsJsonAsync("/test-endpoints/echo", new { name = "ok" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Swagger_is_served_outside_production_and_lists_endpoints()
    {
        var json = await Client().GetStringAsync("/swagger/v1/swagger.json");

        Assert.Contains("/test-endpoints/echo", json);
    }
}
