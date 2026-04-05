namespace BigBoss.Core.Entities;

public class AdminAuditLog
{
    public Guid Id { get; set; }
    public Guid AdminUserId { get; set; }
    public string AdminEmail { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;        // "UPDATE_POINTS_CONFIG", "BAN_USER"
    public string EntityType { get; set; } = string.Empty;    // "GamificationConfig", "User"
    public string? EntityId { get; set; }
    public string? OldValueJson { get; set; }
    public string? NewValueJson { get; set; }
    public string? IpAddress { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
