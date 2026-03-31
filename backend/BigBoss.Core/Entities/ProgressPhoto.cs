namespace BigBoss.Core.Entities;

public class ProgressPhoto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }

    // Photo
    public DateTime TakenAt { get; set; } = DateTime.UtcNow;
    public string StorageUrlEncrypted { get; set; } = string.Empty;

    // Pose type (front, side, back)
    public string PoseType { get; set; } = "front";

    // AI analysis
    public string? AiAnalysisJson { get; set; }
    public decimal? EstimatedBodyFatPercent { get; set; }

    // Sharing
    public bool IsSharedCommunity { get; set; }

    // Timestamps
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public virtual User User { get; set; } = null!;
}
