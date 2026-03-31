namespace BigBoss.Core.DTOs.NutritionPlans;

public class NutritionPlanDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public DateTime WeekStart { get; set; }
    public int TdeeKcal { get; set; }
    public int TargetCalories { get; set; }
    public decimal TargetProteinsG { get; set; }
    public decimal TargetCarbsG { get; set; }
    public decimal TargetFatsG { get; set; }
    public string PlanJson { get; set; } = "{}";
    public bool AiGenerated { get; set; }
    public string? AiPromptUsed { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateNutritionPlanDto
{
    public DateTime WeekStart { get; set; }
    public int TdeeKcal { get; set; }
    public int TargetCalories { get; set; }
    public decimal TargetProteinsG { get; set; }
    public decimal TargetCarbsG { get; set; }
    public decimal TargetFatsG { get; set; }
    public string PlanJson { get; set; } = "{}";
    public bool AiGenerated { get; set; } = true;
    public string? AiPromptUsed { get; set; }
}

public class UpdateNutritionPlanDto
{
    public DateTime? WeekStart { get; set; }
    public int? TdeeKcal { get; set; }
    public int? TargetCalories { get; set; }
    public decimal? TargetProteinsG { get; set; }
    public decimal? TargetCarbsG { get; set; }
    public decimal? TargetFatsG { get; set; }
    public string? PlanJson { get; set; }
    public bool? AiGenerated { get; set; }
    public string? AiPromptUsed { get; set; }
}
