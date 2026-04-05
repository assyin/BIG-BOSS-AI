namespace BigBoss.Core.Entities;

public class AppConfig
{
    public Guid Id { get; set; }
    public string Key { get; set; } = string.Empty; // unique
    public string Value { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty; // "plans", "limits", "content", "maintenance"
    public string Description { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public Guid? UpdatedByAdminId { get; set; }
}
