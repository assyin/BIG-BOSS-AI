using BigBoss.Core.Enums;

namespace BigBoss.Core.Entities;

public class Challenge
{
    public Guid Id { get; set; }

    // Info
    public string Title { get; set; } = string.Empty;
    public string? TitleAr { get; set; }
    public string Description { get; set; } = string.Empty;
    public string? DescriptionAr { get; set; }
    public string? ImageUrl { get; set; }

    // Type
    public ChallengeType Type { get; set; }
    public ChallengeMetric Metric { get; set; } = ChallengeMetric.Volume;
    public string MetricName { get; set; } = string.Empty;
    public string MetricUnit { get; set; } = string.Empty;

    // Target & Gamification
    public decimal? TargetValue { get; set; }
    public int PointsForParticipation { get; set; }
    public int PointsForCompletion { get; set; }
    public int PointsForTop3 { get; set; }
    public int? MaxParticipants { get; set; }
    public SubscriptionTier? RequiredSubscriptionTier { get; set; }
    public bool IsVisibleToFree { get; set; } = true;

    // Duration
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }

    // Rewards
    public string? RewardDescription { get; set; }
    public string? RewardImageUrl { get; set; }

    // Status
    public bool IsActive { get; set; } = true;
    public bool IsFeatured { get; set; }
    public bool IsFinalized { get; set; }

    // Timestamps
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public virtual ICollection<ChallengeParticipation> Participations { get; set; } = new List<ChallengeParticipation>();
}

public enum ChallengeType
{
    Monthly = 1,
    Instant = 2,
    CityVsCity = 3,
    Annual = 4
}

public enum ChallengeMetric
{
    Volume = 1,
    Sessions = 2,
    Streak = 3,
    Calories = 4,
    PRCount = 5,
    Consistency = 6,
}

