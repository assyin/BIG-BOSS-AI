namespace BigBoss.Core.Entities;

public class GamificationConfig
{
    public Guid Id { get; set; }
    public string Key { get; set; } = string.Empty; // unique, e.g. "points.session_complete"
    public string Value { get; set; } = string.Empty; // scalar or JSON
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty; // "points", "streak", "affiliation", "challenges", "shop", "anticheat"
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public Guid? UpdatedByAdminId { get; set; }
}
