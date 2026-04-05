namespace BigBoss.Core.Entities;

public class NotificationTemplate
{
    public Guid Id { get; set; }
    public string TriggerKey { get; set; } = string.Empty; // unique: "achievement_unlocked", "streak_risk"
    public string TitleFr { get; set; } = string.Empty;
    public string? TitleAr { get; set; }
    public string BodyFr { get; set; } = string.Empty;
    public string? BodyAr { get; set; }
    public bool IsActive { get; set; } = true;
    public bool WithCoachVoice { get; set; }
    public int TotalSent { get; set; }
    public decimal OpenRate { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
