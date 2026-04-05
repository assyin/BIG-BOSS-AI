using Microsoft.Extensions.Logging;
using StackExchange.Redis;
using System.Text.Json;

namespace BigBoss.Infrastructure.Services;

public interface IRedisCacheService
{
    Task<T?> GetAsync<T>(string key);
    Task SetAsync<T>(string key, T value, TimeSpan? expiry = null);
    Task RemoveAsync(string key);
    Task InvalidatePatternAsync(string pattern);

    // Sorted sets for leaderboards
    Task SetLeaderboardScoreAsync(string leaderboardKey, string memberId, double score);
    Task<List<LeaderboardCacheEntry>> GetLeaderboardAsync(string leaderboardKey, int top = 50);
    Task RemoveLeaderboardAsync(string leaderboardKey);
}

public class LeaderboardCacheEntry
{
    public string MemberId { get; set; } = string.Empty;
    public double Score { get; set; }
    public int Rank { get; set; }
}

public class RedisCacheService : IRedisCacheService
{
    private readonly IConnectionMultiplexer _redis;
    private readonly ILogger<RedisCacheService> _logger;
    private readonly IDatabase _db;
    private static readonly TimeSpan DefaultExpiry = TimeSpan.FromMinutes(5);

    public RedisCacheService(IConnectionMultiplexer redis, ILogger<RedisCacheService> logger)
    {
        _redis = redis;
        _logger = logger;
        _db = redis.GetDatabase();
    }

    public async Task<T?> GetAsync<T>(string key)
    {
        try
        {
            var value = await _db.StringGetAsync(key);
            if (value.IsNullOrEmpty) return default;
            return JsonSerializer.Deserialize<T>(value!);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis GET failed for key {Key}", key);
            return default;
        }
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? expiry = null)
    {
        try
        {
            var json = JsonSerializer.Serialize(value);
            await _db.StringSetAsync(key, json, expiry ?? DefaultExpiry);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis SET failed for key {Key}", key);
        }
    }

    public async Task RemoveAsync(string key)
    {
        try
        {
            await _db.KeyDeleteAsync(key);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis DELETE failed for key {Key}", key);
        }
    }

    public async Task InvalidatePatternAsync(string pattern)
    {
        try
        {
            var server = _redis.GetServer(_redis.GetEndPoints().First());
            var keys = server.Keys(pattern: pattern).ToArray();
            if (keys.Length > 0)
                await _db.KeyDeleteAsync(keys);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis pattern invalidation failed for {Pattern}", pattern);
        }
    }

    // Sorted sets for leaderboards
    public async Task SetLeaderboardScoreAsync(string leaderboardKey, string memberId, double score)
    {
        try
        {
            await _db.SortedSetAddAsync(leaderboardKey, memberId, score);
            await _db.KeyExpireAsync(leaderboardKey, TimeSpan.FromMinutes(10));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis leaderboard SET failed");
        }
    }

    public async Task<List<LeaderboardCacheEntry>> GetLeaderboardAsync(string leaderboardKey, int top = 50)
    {
        try
        {
            var entries = await _db.SortedSetRangeByRankWithScoresAsync(leaderboardKey, 0, top - 1, Order.Descending);
            return entries.Select((e, i) => new LeaderboardCacheEntry
            {
                MemberId = e.Element.ToString(),
                Score = e.Score,
                Rank = i + 1,
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis leaderboard GET failed");
            return new List<LeaderboardCacheEntry>();
        }
    }

    public async Task RemoveLeaderboardAsync(string leaderboardKey)
    {
        await RemoveAsync(leaderboardKey);
    }
}
