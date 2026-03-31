namespace BigBoss.Core.Entities;

public class NutritionPlan
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }

    // Week info
    public DateTime WeekStart { get; set; }

    // Calculated needs
    public int TdeeKcal { get; set; }
    public int TargetCalories { get; set; }
    public decimal TargetProteinsG { get; set; }
    public decimal TargetCarbsG { get; set; }
    public decimal TargetFatsG { get; set; }

    // Plan content (JSON with 7 days of meals)
    public string PlanJson { get; set; } = "{}";

    // AI generated
    public bool AiGenerated { get; set; } = true;
    public string? AiPromptUsed { get; set; }

    // Timestamps
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public virtual User User { get; set; } = null!;
}
