using BigBoss.Core.Entities;

namespace BigBoss.Core.Interfaces;

public interface IGamificationConfigService
{
    Task<int> GetIntAsync(string key, int defaultValue = 0);
    Task<decimal> GetDecimalAsync(string key, decimal defaultValue = 0);
    Task<string> GetStringAsync(string key, string defaultValue = "");
    Task<bool> GetBoolAsync(string key, bool defaultValue = false);
    Task<List<GamificationConfig>> GetAllAsync(string? category = null);
    Task<GamificationConfig?> GetByKeyAsync(string key);
    Task SetAsync(string key, string value, Guid? adminId = null);
    Task<bool> IsFeatureEnabledAsync(string featureKey);
    void InvalidateCache();
}
