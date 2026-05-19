using BigBoss.Infrastructure.Services;
using FluentAssertions;
using Xunit;

namespace BigBoss.Tests.Services;

/// <summary>
/// Sprint 6.2 — Tests pour NoOpCacheService (fallback si Redis down).
/// </summary>
public class NoOpCacheServiceTests
{
    [Fact]
    public void NoOpCacheService_IsConnected_AlwaysFalse()
    {
        var svc = new NoOpCacheService();
        svc.IsConnected.Should().BeFalse();
    }

    [Fact]
    public void NoOpCacheService_HitsAndMisses_AreZero()
    {
        var svc = new NoOpCacheService();
        svc.CacheHits.Should().Be(0);
        svc.CacheMisses.Should().Be(0);
    }

    [Fact]
    public async Task NoOpCacheService_GetAsync_ReturnsDefault()
    {
        var svc = new NoOpCacheService();
        var result = await svc.GetAsync<string>("any-key");
        result.Should().BeNull();
    }

    [Fact]
    public async Task NoOpCacheService_GetOrSetAsync_AlwaysCallsFactory()
    {
        var svc = new NoOpCacheService();
        int factoryCallCount = 0;

        Func<Task<string?>> factory = () =>
        {
            factoryCallCount++;
            return Task.FromResult<string?>("value");
        };

        var result1 = await svc.GetOrSetAsync("k", factory);
        var result2 = await svc.GetOrSetAsync("k", factory);

        // Factory appelée à chaque fois (pas de cache)
        factoryCallCount.Should().Be(2);
        result1.Should().Be("value");
        result2.Should().Be("value");
    }

    [Fact]
    public async Task NoOpCacheService_SetGet_NoOp()
    {
        var svc = new NoOpCacheService();
        await svc.SetAsync("k", "v");
        var v = await svc.GetAsync<string>("k");
        v.Should().BeNull(); // pas stocké
    }
}
