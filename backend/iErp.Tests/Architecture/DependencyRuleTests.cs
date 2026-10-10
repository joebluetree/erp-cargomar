using System.Reflection;
using iErp.Data;
using iErp.Entities;
using iErp.ModuleTemplate;
using iErp.Reports;
using iErp.Shared.Exceptions;
using iErp.SharedBusiness;

namespace iErp.Tests.Architecture;

public class DependencyRuleTests
{
    private static readonly Assembly Entities = typeof(EntitiesMarker).Assembly;
    private static readonly Assembly Shared = typeof(NotFoundException).Assembly;
    private static readonly Assembly Data = typeof(AppDbContext).Assembly;
    private static readonly Assembly SharedBusiness = typeof(SharedBusinessMarker).Assembly;
    private static readonly Assembly[] Modules =
        [typeof(ModuleTemplateRegistration).Assembly, typeof(ReportsRegistration).Assembly];

    private static IEnumerable<string> References(Assembly a) =>
        a.GetReferencedAssemblies().Select(r => r.Name!).Where(n => n.StartsWith("iErp."));

    [Fact]
    public void Entities_depends_on_no_project() => Assert.Empty(References(Entities));

    [Fact]
    public void Shared_depends_on_no_project() => Assert.Empty(References(Shared));

    [Fact]
    public void Data_depends_only_on_Entities()
        => Assert.All(References(Data), n => Assert.Equal("iErp.Entities", n));

    [Fact]
    public void SharedBusiness_depends_only_on_Entities_and_Shared()
        => Assert.All(References(SharedBusiness), n => Assert.Contains(n, new[] { "iErp.Entities", "iErp.Shared" }));

    [Fact]
    public void Modules_do_not_depend_on_Api_or_other_modules()
    {
        foreach (var module in Modules)
        {
            var others = Modules.Where(m => m != module).Select(m => m.GetName().Name!);
            Assert.All(References(module), n =>
            {
                Assert.NotEqual("iErp.Api", n);
                Assert.DoesNotContain(n, others);
            });
        }
    }

    [Fact]
    public void Module_types_do_not_depend_on_Api_namespace()
    {
        foreach (var module in Modules)
        {
            var result = NetArchTest.Rules.Types.InAssembly(module)
                .Should().NotHaveDependencyOn("iErp.Api").GetResult();
            Assert.True(result.IsSuccessful, string.Join(", ", result.FailingTypeNames ?? []));
        }
    }

    [Fact]
    public void Controllers_do_not_use_repositories_or_DbContext()
    {
        foreach (var module in Modules)
        {
            var result = NetArchTest.Rules.Types.InAssembly(module)
                .That().HaveNameEndingWith("Controller")
                .Should().NotHaveDependencyOn("iErp.Data").GetResult();
            Assert.True(result.IsSuccessful, string.Join(", ", result.FailingTypeNames ?? []));
        }
    }

    [Fact]
    public void Product_assemblies_do_not_contain_or_use_test_code()
    {
        foreach (var assembly in new[] { typeof(Program).Assembly }.Concat(Modules))
        {
            var result = NetArchTest.Rules.Types.InAssembly(assembly)
                .Should().NotHaveDependencyOn("iErp.Tests").GetResult();
            Assert.True(result.IsSuccessful, string.Join(", ", result.FailingTypeNames ?? []));
        }
    }
}
