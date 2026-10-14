namespace iErp.Admin.ChangeBranch;

/// <summary>What the logged-in user may switch to: the allowed branches by name and the company's years, newest first.</summary>
public record SessionOptions(IReadOnlyList<BranchOption> Branches, IReadOnlyList<YearOption> Years);

public record BranchOption(string Id, string Name);

public record YearOption(string Id, string Code, string Name);
