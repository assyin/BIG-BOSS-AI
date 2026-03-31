namespace BigBoss.Core.Entities;

public class Challenge
{
    public Guid Id { get; set; }

    // Info
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }

    // Type
    public ChallengeType Type { get; set; }
    public string MetricName { get; set; } = string.Empty;
    public string MetricUnit { get; set; } = string.Empty;

    // Duration
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }

    // Rewards
    public string? RewardDescription { get; set; }
    public string? RewardImageUrl { get; set; }

    // Status
    public bool IsActive { get; set; } = true;
    public bool IsFeatured { get; set; }

    // Timestamps
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public enum ChallengeType
{
    Volume = 1,        // Total weight lifted
    Consistency = 2,   // Days trained
    Strength = 3,      // PR improvement
    Transformation = 4 // Body transformation
}
