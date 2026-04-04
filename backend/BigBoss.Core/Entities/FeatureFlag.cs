namespace BigBoss.Core.Entities;

public class FeatureFlag
{
    public Guid Id { get; set; }
    public string Key { get; set; } = string.Empty; // unique, e.g. "coach_vocal"
    public bool IsEnabled { get; set; } = true;
    public string Description { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public Guid? UpdatedByAdminId { get; set; }
}
