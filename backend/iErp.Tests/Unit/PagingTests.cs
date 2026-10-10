using iErp.Data;
using iErp.Shared.Paging;

namespace iErp.Tests.Unit;

public class PagingTests
{
    private static readonly IQueryable<int> Numbers = Enumerable.Range(1, 23).AsQueryable();

    [Fact]
    public void ForPage_takes_the_rows_of_the_requested_page()
    {
        Assert.Equal(Enumerable.Range(1, 10), Numbers.ForPage(1, 10));
        Assert.Equal(Enumerable.Range(11, 10), Numbers.ForPage(2, 10));
        Assert.Equal([21, 22, 23], Numbers.ForPage(3, 10));
    }

    [Fact]
    public void ForPage_after_the_last_page_is_empty()
        => Assert.Empty(Numbers.ForPage(4, 10));

    [Theory]
    [InlineData(0, 10)]
    [InlineData(-1, 10)]
    [InlineData(1, 0)]
    [InlineData(1, -5)]
    public void ForPage_rejects_a_page_or_size_below_one(int page, int pageSize)
        => Assert.Throws<ArgumentOutOfRangeException>(() => Numbers.ForPage(page, pageSize));

    [Fact]
    public void ForPage_rejects_an_offset_that_overflows()
        => Assert.Throws<OverflowException>(() => Numbers.ForPage(int.MaxValue, 100));

    [Fact]
    public void Paging_rules_allow_exactly_the_agreed_page_sizes()
    {
        Assert.Equal([2, 5, 10, 25, 50, 100], PagingRules.AllowedPageSizes);
        Assert.All(PagingRules.AllowedPageSizes, size => Assert.True(PagingRules.IsAllowedPageSize(size)));
        Assert.All(new[] { 0, 1, 7, 11, 101, 500, -10 }, size => Assert.False(PagingRules.IsAllowedPageSize(size)));
        Assert.Equal(10, PagingRules.DefaultPageSize);
        Assert.Equal(1, PagingRules.DefaultPage);
        Assert.Contains(PagingRules.DefaultPageSize, PagingRules.AllowedPageSizes);
    }
}
