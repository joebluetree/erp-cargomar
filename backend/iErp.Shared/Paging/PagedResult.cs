namespace iErp.Shared.Paging;

/// <summary>One page of a table plus the number of rows that match the filters. Every table endpoint returns this shape.</summary>
public record PagedResult<T>(IReadOnlyList<T> Items, int Total, int Page, int PageSize);
