namespace BigBoss.Core.Entities;

public class Achievement
{
    public Guid Id { get; set; }
    public string Key { get; set; } = string.Empty; // unique, e.g. "first_session", "streak_30"
    public string Title { get; set; } = string.Empty;
    public string? TitleAr { get; set; }
    public string Description { get; set; } = string.Empty;
    public string? DescriptionAr { get; set; }
    public string? IconUrl { get; set; }
    public AchievementCategory Category { get; set; }
    public string TriggerType { get; set; } = string.Empty; // "streak", "sessions", "volume", "pr_count"
    public int TriggerValue { get; set; } // e.g. 30 for streak_30
    public int PointsReward { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public virtual ICollection<UserAchievement> UserAchievements { get; set; } = new List<UserAchievement>();
}

public class UserAchievement
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid AchievementId { get; set; }
    public DateTime UnlockedAt { get; set; } = DateTime.UtcNow;
    public int PointsAwarded { get; set; }

    public virtual User User { get; set; } = null!;
    public virtual Achievement Achievement { get; set; } = null!;
}

public enum AchievementCategory
{
    Consistency = 1,
    Strength = 2,
    Volume = 3,
    Social = 4,
    Milestone = 5,
    Nutrition = 6,
}
