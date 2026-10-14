using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using iErp.Shared.Auth;
using iErp.Shared.Exceptions;

namespace iErp.Tests.TestSupport;

public record EchoRequest(string? Name);

public class EchoRequestValidator : AbstractValidator<EchoRequest>
{
    public EchoRequestValidator() => RuleFor(x => x.Name).NotEmpty();
}

/// <summary>
/// Test-only endpoints that exercise the HTTP pipeline (validation, error handling) without a business feature.
/// Added to the host by <see cref="Integration.ApiFactory"/>; never part of the shipped API.
/// </summary>
[ApiController]
[Route("test-endpoints")]
public class TestEndpointsController : ControllerBase
{
    public const string Secret = "secret connection detail";

    [HttpGet("not-found")]
    public IActionResult NotFoundCase() => throw new NotFoundException("Thing", 42);

    [HttpGet("boom")]
    public IActionResult Boom() => throw new InvalidOperationException(Secret);

    [HttpPost("echo")]
    public IActionResult Echo(EchoRequest request) => Ok(request);

    [HttpGet("session")]
    public IActionResult Session([FromServices] ICurrentSession session) => Ok(new
    {
        session.IsAuthenticated, session.UserId, session.UserCode, session.CompanyId, session.CompanyCode, session.BranchId, session.YearId
    });
}
