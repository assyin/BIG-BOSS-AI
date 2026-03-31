using BigBoss.Core.Enums;

namespace BigBoss.Core.Entities;

public class Meal
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }

    // Meal info
    public MealType MealType { get; set; }
    public DateTime LoggedAt { get; set; } = DateTime.UtcNow;

    // Photo (optional)
    public string? PhotoUrl { get; set; }

    // Items (JSON structure with name, quantity, macros)
    public string ItemsJson { get; set; } = "[]";

    // Totals
    public int TotalCalories { get; set; }
    public decimal ProteinsG { get; set; }
    public decimal CarbsG { get; set; }
    public decimal FatsG { get; set; }
    public decimal? FiberG { get; set; }

    // AI analysis
    public string? AiAnalysisText { get; set; }
    public bool WasScanned { get; set; }

    // Timestamps
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public virtual User User { get; set; } = null!;
}
