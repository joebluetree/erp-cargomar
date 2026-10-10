namespace iErp.Shared.Paging;

/// <summary>The paging rules shared by every table endpoint.</summary>
public static class PagingRules
{
    public const int DefaultPage = 1;
    public const int DefaultPageSize = 10;

    /// <summary>
    /// The page sizes a client may ask for; the largest is the cap. 2 is there so that paging can be tried with a
    /// handful of rows.
    /// </summary>
    public static readonly IReadOnlyList<int> AllowedPageSizes = [2, 5, 10, 25, 50, 100];

    public static bool IsAllowedPageSize(int pageSize) => AllowedPageSizes.Contains(pageSize);
}
