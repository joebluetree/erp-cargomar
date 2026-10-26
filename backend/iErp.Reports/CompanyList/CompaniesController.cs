using iErp.Shared.Auth;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using iErp.Shared.Paging;

namespace iErp.Reports.CompanyList;

[ApiController]
[Route("api/reports/companies")]
[RequiresMenu(MenuCodes.CompanyList)]
public class CompaniesController(ICompanyListService service) : ControllerBase
{
    /// <summary>One page of companies, filtered by code and name and ordered by name ascending.</summary>
    [HttpGet]
    [ProducesResponseType<PagedResult<CompanyListItemDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<PagedResult<CompanyListItemDto>> List([FromQuery] CompanyListQuery query, CancellationToken ct)
        => await service.ListAsync(query, ct);
}
