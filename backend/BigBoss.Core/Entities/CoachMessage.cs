namespace BigBoss.Core.Entities;

public class CoachMessage
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }

    // Message
    public string Role { get; set; } = "user"; // "user" or "assistant"
    public string Content { get; set; } = string.Empty;

    // Media (optional)
    public string? AudioUrl { get; set; }
    public string? ImageUrl { get; set; }

    // AI metadata
    public int? TokensUsed { get; set; }
    public string? ModelUsed { get; set; }
    public int? LatencyMs { get; set; }

    // Context (for AI memory)
    public string? ContextJson { get; set; }

    // Timestamps
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public virtual User User { get; set; } = null!;
}
