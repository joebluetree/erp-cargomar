using System.Data.Common;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace iErp.Data;

/// <summary>
/// Lets the Oracle EF provider run against Oracle 10g (the target database):
/// 1. 10g rejects carriage returns in the PL/SQL blocks the provider emits (inserts, migration history checks),
///    so line endings are normalized to LF.
/// 2. 10g has no row-limiting clause, so a trailing <c>FETCH FIRST n ROWS ONLY</c> (from First/Find/Take)
///    is rewritten to a ROWNUM wrapper.
/// 3. For paging, a trailing <c>OFFSET a ROWS FETCH NEXT b ROWS ONLY</c> (from Skip/Take; <c>a</c> and <c>b</c> are
///    bind names such as <c>:p_0</c>, or numbers) is rewritten to a nested ROWNUM query.
/// </summary>
public class Oracle10gCompatibilityInterceptor : DbCommandInterceptor
{
    private static readonly Regex FetchFirst = new(
        @"\s+FETCH FIRST (\d+) ROWS ONLY\s*$", RegexOptions.Compiled | RegexOptions.IgnoreCase);

    private static readonly Regex OffsetFetch = new(
        @"\s+OFFSET\s+(\d+|:\w+)\s+ROWS\s+FETCH\s+NEXT\s+(\d+|:\w+)\s+ROWS\s+ONLY\s*$",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    public override InterceptionResult<int> NonQueryExecuting(
        DbCommand command, CommandEventData eventData, InterceptionResult<int> result)
    {
        Normalize(command);
        return result;
    }

    public override ValueTask<InterceptionResult<int>> NonQueryExecutingAsync(
        DbCommand command, CommandEventData eventData, InterceptionResult<int> result, CancellationToken ct = default)
    {
        Normalize(command);
        return ValueTask.FromResult(result);
    }

    public override InterceptionResult<DbDataReader> ReaderExecuting(
        DbCommand command, CommandEventData eventData, InterceptionResult<DbDataReader> result)
    {
        Normalize(command);
        return result;
    }

    public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(
        DbCommand command, CommandEventData eventData, InterceptionResult<DbDataReader> result, CancellationToken ct = default)
    {
        Normalize(command);
        return ValueTask.FromResult(result);
    }

    public override InterceptionResult<object> ScalarExecuting(
        DbCommand command, CommandEventData eventData, InterceptionResult<object> result)
    {
        Normalize(command);
        return result;
    }

    public override ValueTask<InterceptionResult<object>> ScalarExecutingAsync(
        DbCommand command, CommandEventData eventData, InterceptionResult<object> result, CancellationToken ct = default)
    {
        Normalize(command);
        return ValueTask.FromResult(result);
    }

    public static string Rewrite(string sql)
    {
        sql = sql.Replace("\r\n", "\n").Replace('\r', '\n');

        var paging = OffsetFetch.Match(sql);
        if (paging.Success)
        {
            // Rows (skip, skip + take] of the ordered query. The inner ORDER BY is kept; ROWNUM numbers its output.
            var skip = paging.Groups[1].Value;
            var take = paging.Groups[2].Value;
            return $"SELECT * FROM (\nSELECT \"t\".*, ROWNUM \"RN__\" FROM (\n{sql[..paging.Index]}\n) \"t\" WHERE ROWNUM <= {skip} + {take}\n) WHERE \"RN__\" > {skip}";
        }

        var match = FetchFirst.Match(sql);
        if (match.Success && !sql.Contains(" OFFSET ", StringComparison.OrdinalIgnoreCase))
            sql = $"SELECT * FROM (\n{sql[..match.Index]}\n) WHERE ROWNUM <= {match.Groups[1].Value}";
        return sql;
    }

    private static void Normalize(DbCommand command) => command.CommandText = Rewrite(command.CommandText);
}
