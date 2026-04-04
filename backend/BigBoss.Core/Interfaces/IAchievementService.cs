using BigBoss.Core.Entities;

namespace BigBoss.Core.Interfaces;

public interface IAchievementService
{
    Task<List<AchievementWithStatus>> GetAllForUserAsync(Guid userId);
    Task<List<UserAchievement>> GetUnlockedAsync(Guid userId);
    Task<List<UserAchievement>> CheckAndAwardAsync(Guid userId);
}

public class AchievementWithStatus
{
    public Guid Id { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? TitleAr { get; set; }
    public string Description { get; set; } = string.Empty;
    public string? IconUrl { get; set; }
    public int Category { get; set; }
    public int PointsReward { get; set; }
    public bool IsUnlocked { get; set; }
    public DateTime? UnlockedAt { get; set; }
    public decimal Progress { get; set; } // 0-100%
    public int CurrentValue { get; set; }
    public int TargetValue { get; set; }
}
