using BigBoss.Core.DTOs.NutritionPlans;

namespace BigBoss.Core.Interfaces;

public interface INutritionPlanService
{
    Task<IEnumerable<NutritionPlanDto>> GetByUserIdAsync(Guid userId);
    Task<NutritionPlanDto?> GetByIdAsync(Guid id, Guid userId);
    Task<NutritionPlanDto> CreateAsync(Guid userId, CreateNutritionPlanDto dto);
    Task<NutritionPlanDto?> UpdateAsync(Guid id, Guid userId, UpdateNutritionPlanDto dto);
    Task<bool> DeleteAsync(Guid id, Guid userId);
    Task<NutritionPlanDto?> GetCurrentWeekAsync(Guid userId);
}
