namespace BigBoss.Infrastructure.Services;

/// <summary>
/// Sprint 6.2 — Fallback no-op si Redis indispo.
/// Permet d'éviter le crash de DI quand Redis n'est pas démarré (dev local sans docker redis).
/// GetOrSetAsync appelle directement factory sans cacher.
/// </summary>
public class NoOpCacheService : IRedisCacheService
{
    public bool IsConnected => false;
    public long CacheHits => 0;
    public long CacheMisses => 0;

    public Task<T?> GetAsync<T>(string key) => Task.FromResult<T?>(default);
    public Task SetAsync<T>(string key, T value, TimeSpan? expiry = null) => Task.CompletedTask;
    public Task RemoveAsync(string key) => Task.CompletedTask;
    public Task InvalidatePatternAsync(string pattern) => Task.CompletedTask;
    public async Task<T?> GetOrSetAsync<T>(string key, Func<Task<T?>> factory, TimeSpan? expiry = null)
        => await factory();
    public Task SetLeaderboardScoreAsync(string leaderboardKey, string memberId, double score) => Task.CompletedTask;
    public Task<List<LeaderboardCacheEntry>> GetLeaderboardAsync(string leaderboardKey, int top = 50)
        => Task.FromResult(new List<LeaderboardCacheEntry>());
    public Task RemoveLeaderboardAsync(string leaderboardKey) => Task.CompletedTask;
}
