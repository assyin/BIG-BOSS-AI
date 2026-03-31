using BigBoss.Core.DTOs.NutritionPlans;
using BigBoss.Core.Entities;
using BigBoss.Core.Interfaces;
using BigBoss.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BigBoss.Infrastructure.Services;

public class NutritionPlanService : INutritionPlanService
{
    private readonly BigBossDbContext _context;
    private readonly ILogger<NutritionPlanService> _logger;

    public NutritionPlanService(BigBossDbContext context, ILogger<NutritionPlanService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<IEnumerable<NutritionPlanDto>> GetByUserIdAsync(Guid userId)
    {
        var plans = await _context.NutritionPlans
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.WeekStart)
            .ToListAsync();

        return plans.Select(MapToDto);
    }

    public async Task<NutritionPlanDto?> GetByIdAsync(Guid id, Guid userId)
    {
        var plan = await _context.NutritionPlans
            .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);

        return plan == null ? null : MapToDto(plan);
    }

    public async Task<NutritionPlanDto> CreateAsync(Guid userId, CreateNutritionPlanDto dto)
    {
        var plan = new NutritionPlan
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            WeekStart = dto.WeekStart,
            TdeeKcal = dto.TdeeKcal,
            TargetCalories = dto.TargetCalories,
            TargetProteinsG = dto.TargetProteinsG,
            TargetCarbsG = dto.TargetCarbsG,
            TargetFatsG = dto.TargetFatsG,
            PlanJson = dto.PlanJson,
            AiGenerated = dto.AiGenerated,
            AiPromptUsed = dto.AiPromptUsed,
            CreatedAt = DateTime.UtcNow
        };

        _context.NutritionPlans.Add(plan);
        await _context.SaveChangesAsync();

        _logger.LogInformation("NutritionPlan created for user {UserId} (ID: {Id})", userId, plan.Id);

        return MapToDto(plan);
    }

    public async Task<NutritionPlanDto?> UpdateAsync(Guid id, Guid userId, UpdateNutritionPlanDto dto)
    {
        var plan = await _context.NutritionPlans
            .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);

        if (plan == null) return null;

        if (dto.WeekStart.HasValue) plan.WeekStart = dto.WeekStart.Value;
        if (dto.TdeeKcal.HasValue) plan.TdeeKcal = dto.TdeeKcal.Value;
        if (dto.TargetCalories.HasValue) plan.TargetCalories = dto.TargetCalories.Value;
        if (dto.TargetProteinsG.HasValue) plan.TargetProteinsG = dto.TargetProteinsG.Value;
        if (dto.TargetCarbsG.HasValue) plan.TargetCarbsG = dto.TargetCarbsG.Value;
        if (dto.TargetFatsG.HasValue) plan.TargetFatsG = dto.TargetFatsG.Value;
        if (dto.PlanJson != null) plan.PlanJson = dto.PlanJson;
        if (dto.AiGenerated.HasValue) plan.AiGenerated = dto.AiGenerated.Value;
        if (dto.AiPromptUsed != null) plan.AiPromptUsed = dto.AiPromptUsed;

        await _context.SaveChangesAsync();

        _logger.LogInformation("NutritionPlan updated: {Id}", id);

        return MapToDto(plan);
    }

    public async Task<bool> DeleteAsync(Guid id, Guid userId)
    {
        var plan = await _context.NutritionPlans
            .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);

        if (plan == null) return false;

        _context.NutritionPlans.Remove(plan);
        await _context.SaveChangesAsync();

        _logger.LogInformation("NutritionPlan deleted: {Id}", id);

        return true;
    }

    public async Task<NutritionPlanDto?> GetCurrentWeekAsync(Guid userId)
    {
        var today = DateTime.UtcNow.Date;
        // Find the plan whose week contains today (WeekStart <= today < WeekStart + 7 days)
        var plan = await _context.NutritionPlans
            .Where(n => n.UserId == userId && n.WeekStart <= today && n.WeekStart.AddDays(7) > today)
            .OrderByDescending(n => n.WeekStart)
            .FirstOrDefaultAsync();

        return plan == null ? null : MapToDto(plan);
    }

    private static NutritionPlanDto MapToDto(NutritionPlan plan)
    {
        return new NutritionPlanDto
        {
            Id = plan.Id,
            UserId = plan.UserId,
            WeekStart = plan.WeekStart,
            TdeeKcal = plan.TdeeKcal,
            TargetCalories = plan.TargetCalories,
            TargetProteinsG = plan.TargetProteinsG,
            TargetCarbsG = plan.TargetCarbsG,
            TargetFatsG = plan.TargetFatsG,
            PlanJson = plan.PlanJson,
            AiGenerated = plan.AiGenerated,
            AiPromptUsed = plan.AiPromptUsed,
            CreatedAt = plan.CreatedAt
        };
    }
}
