using BigBoss.Core.Entities;
using BigBoss.Core.Interfaces;
using BigBoss.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace BigBoss.Infrastructure.Services;

public class GamificationConfigService : IGamificationConfigService
{
    private readonly BigBossDbContext _context;
    private readonly IMemoryCache _cache;
    private const string CachePrefix = "gconfig:";
    private const string AllConfigsCacheKey = "gconfig:all";
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);

    public GamificationConfigService(BigBossDbContext context, IMemoryCache cache)
    {
        _context = context;
        _cache = cache;
    }

    public async Task<int> GetIntAsync(string key, int defaultValue = 0)
    {
        var val = await GetStringAsync(key);
        return int.TryParse(val, out var result) ? result : defaultValue;
    }

    public async Task<decimal> GetDecimalAsync(string key, decimal defaultValue = 0)
    {
        var val = await GetStringAsync(key);
        return decimal.TryParse(val, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var result) ? result : defaultValue;
    }

    public async Task<string> GetStringAsync(string key, string defaultValue = "")
    {
        var cacheKey = CachePrefix + key;
        if (_cache.TryGetValue(cacheKey, out string? cached) && cached != null)
            return cached;

        var config = await _context.GamificationConfigs
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Key == key);

        var value = config?.Value ?? defaultValue;
        _cache.Set(cacheKey, value, CacheDuration);
        return value;
    }

    public async Task<bool> GetBoolAsync(string key, bool defaultValue = false)
    {
        var val = await GetStringAsync(key);
        return bool.TryParse(val, out var result) ? result : defaultValue;
    }

    public async Task<List<GamificationConfig>> GetAllAsync(string? category = null)
    {
        var query = _context.GamificationConfigs.AsNoTracking();
        if (!string.IsNullOrEmpty(category))
            query = query.Where(c => c.Category == category);
        return await query.OrderBy(c => c.Category).ThenBy(c => c.Key).ToListAsync();
    }

    public async Task<GamificationConfig?> GetByKeyAsync(string key)
    {
        return await _context.GamificationConfigs.AsNoTracking().FirstOrDefaultAsync(c => c.Key == key);
    }

    public async Task SetAsync(string key, string value, Guid? adminId = null)
    {
        var config = await _context.GamificationConfigs.FirstOrDefaultAsync(c => c.Key == key);
        if (config != null)
        {
            config.Value = value;
            config.UpdatedAt = DateTime.UtcNow;
            config.UpdatedByAdminId = adminId;
        }
        else
        {
            _context.GamificationConfigs.Add(new GamificationConfig
            {
                Id = Guid.NewGuid(),
                Key = key,
                Value = value,
                UpdatedAt = DateTime.UtcNow,
                UpdatedByAdminId = adminId
            });
        }
        await _context.SaveChangesAsync();
        InvalidateCache();
    }

    public async Task<bool> IsFeatureEnabledAsync(string featureKey)
    {
        var cacheKey = "feature:" + featureKey;
        if (_cache.TryGetValue(cacheKey, out bool cached))
            return cached;

        var flag = await _context.FeatureFlags.AsNoTracking().FirstOrDefaultAsync(f => f.Key == featureKey);
        var enabled = flag?.IsEnabled ?? true;
        _cache.Set(cacheKey, enabled, CacheDuration);
        return enabled;
    }

    public void InvalidateCache()
    {
        // Clear all gamification config cache entries
        if (_cache is MemoryCache mc)
            mc.Compact(1.0);
    }
}
