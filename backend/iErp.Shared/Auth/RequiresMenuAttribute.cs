using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace iErp.Shared.Auth;

/// <summary>The codes (<c>MENUM.MENU_CODE</c>) of the new-software menus whose screens' endpoints need their view right.</summary>
public static class MenuCodes
{
    public const string CompanyList = "NS-COMPLIST";
    public const string BranchList = "NS-BRANCHLIST";
    public const string EmployeeProfile = "NS-EMPPROFILE";
    public const string EmployeeList = "NS-EMPLIST";
    public const string HolidayList = "NS-HOLIDAYLIST";
}

/// <summary>Whether the logged-in user may use a menu's screen. Implemented by the Admin module (user rights).</summary>
public interface IMenuAccess
{
    /// <summary>True when the session user has the view right, in the session branch, on the company's menu with this code.</summary>
    Task<bool> CanViewAsync(string menuCode, CancellationToken ct = default);
}

/// <summary>
/// Marks a controller or action as a screen of the menu with this code (admin-user-rights design D3). A request without
/// the view right on that menu answers 403 "You do not have access to this screen." before the action runs, so neither
/// a typed URL nor a direct API call bypasses the menu.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class RequiresMenuAttribute : TypeFilterAttribute
{
    public RequiresMenuAttribute(string menuCode) : base(typeof(MenuAccessFilter))
    {
        MenuCode = menuCode;
        Arguments = [menuCode];
    }

    public string MenuCode { get; }
}

/// <summary>The check behind <see cref="RequiresMenuAttribute"/>. Authentication has already run (every endpoint needs a token).</summary>
public sealed class MenuAccessFilter(string menuCode, IMenuAccess access) : IAsyncAuthorizationFilter
{
    public const string NoAccessMessage = "You do not have access to this screen.";

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        if (context.HttpContext.User.Identity?.IsAuthenticated != true)
            return; // the authorization policy answers 401
        if (await access.CanViewAsync(menuCode, context.HttpContext.RequestAborted))
            return;

        context.Result = new ObjectResult(ApiProblem.Create(context.HttpContext, StatusCodes.Status403Forbidden, NoAccessMessage))
        {
            StatusCode = StatusCodes.Status403Forbidden,
        };
    }
}
