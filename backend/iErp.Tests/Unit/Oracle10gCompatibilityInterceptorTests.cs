using iErp.Data;

namespace iErp.Tests.Unit;

public class Oracle10gCompatibilityInterceptorTests
{
    [Fact]
    public void Fetch_first_is_rewritten_to_rownum()
    {
        var sql = Oracle10gCompatibilityInterceptor.Rewrite("SELECT \"t\".\"ID\"\r\nFROM \"T\" \"t\"\r\nWHERE \"t\".\"ID\" = :p_0\r\nFETCH FIRST 1 ROWS ONLY");

        Assert.Equal("SELECT * FROM (\nSELECT \"t\".\"ID\"\nFROM \"T\" \"t\"\nWHERE \"t\".\"ID\" = :p_0\n) WHERE ROWNUM <= 1", sql);
    }

    [Fact]
    public void Carriage_returns_are_removed()
        => Assert.DoesNotContain('\r', Oracle10gCompatibilityInterceptor.Rewrite("DECLARE\r\nBEGIN\r\nNULL;\r\nEND;"));

    [Fact]
    public void Plain_select_is_unchanged()
        => Assert.Equal("SELECT 1 FROM DUAL", Oracle10gCompatibilityInterceptor.Rewrite("SELECT 1 FROM DUAL"));

    [Fact]
    public void Offset_fetch_with_bind_names_is_rewritten_to_nested_rownum()
    {
        var sql = Oracle10gCompatibilityInterceptor.Rewrite(
            "SELECT \"c\".\"ID\"\nFROM \"T\" \"c\"\nORDER BY \"c\".\"NAME\", \"c\".\"ID\"\nOFFSET :p_0 ROWS FETCH NEXT :p_1 ROWS ONLY");

        Assert.Equal(
            "SELECT * FROM (\nSELECT \"t\".*, ROWNUM \"RN__\" FROM (\n" +
            "SELECT \"c\".\"ID\"\nFROM \"T\" \"c\"\nORDER BY \"c\".\"NAME\", \"c\".\"ID\"\n" +
            ") \"t\" WHERE ROWNUM <= :p_0 + :p_1\n) WHERE \"RN__\" > :p_0",
            sql);
    }

    [Fact]
    public void Offset_fetch_where_offset_and_size_share_one_bind_is_rewritten()
    {
        var sql = Oracle10gCompatibilityInterceptor.Rewrite("SELECT 1 FROM T ORDER BY ID OFFSET :p_0 ROWS FETCH NEXT :p_0 ROWS ONLY");

        Assert.EndsWith(") \"t\" WHERE ROWNUM <= :p_0 + :p_0\n) WHERE \"RN__\" > :p_0", sql);
    }

    [Fact]
    public void Offset_fetch_with_numbers_is_rewritten()
    {
        var sql = Oracle10gCompatibilityInterceptor.Rewrite("SELECT 1 FROM T ORDER BY ID\nOFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY");

        Assert.EndsWith(") \"t\" WHERE ROWNUM <= 20 + 10\n) WHERE \"RN__\" > 20", sql);
        Assert.DoesNotContain("OFFSET", sql);
        Assert.DoesNotContain("FETCH", sql);
    }

    [Fact]
    public void Offset_fetch_is_rewritten_when_the_text_has_windows_line_endings_and_different_case()
    {
        var sql = Oracle10gCompatibilityInterceptor.Rewrite("select 1 from t order by id\r\noffset :a rows fetch next :b rows only\r\n");

        Assert.DoesNotContain('\r', sql);
        Assert.DoesNotContain("offset", sql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("ROWNUM <= :a + :b", sql);
        Assert.EndsWith("\"RN__\" > :a", sql);
    }

    [Fact]
    public void The_inner_query_and_its_order_by_are_kept_intact()
    {
        const string inner = "SELECT \"c\".\"X\"\nFROM \"T\" \"c\"\nWHERE \"c\".\"Y\" = N'C'\nORDER BY \"c\".\"X\", \"c\".\"ID\"";

        var sql = Oracle10gCompatibilityInterceptor.Rewrite(inner + "\nOFFSET :p_0 ROWS FETCH NEXT :p_1 ROWS ONLY");

        Assert.Contains("(\n" + inner + "\n) \"t\"", sql);
    }

    [Fact]
    public void A_query_with_offset_in_the_middle_but_no_trailing_paging_clause_is_unchanged()
    {
        const string sql = "SELECT 'OFFSET 1 ROWS FETCH NEXT 2 ROWS ONLY' AS \"Note\" FROM DUAL";

        Assert.Equal(sql, Oracle10gCompatibilityInterceptor.Rewrite(sql));
    }

    [Fact]
    public void Fetch_first_still_works_for_plain_take()
    {
        var sql = Oracle10gCompatibilityInterceptor.Rewrite("SELECT 1 FROM T ORDER BY ID FETCH FIRST 5 ROWS ONLY");

        Assert.Equal("SELECT * FROM (\nSELECT 1 FROM T ORDER BY ID\n) WHERE ROWNUM <= 5", sql);
    }
}
