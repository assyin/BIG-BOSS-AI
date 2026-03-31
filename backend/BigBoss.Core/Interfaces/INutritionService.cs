using BigBoss.Core.DTOs.Nutrition;

namespace BigBoss.Core.Interfaces;

public interface INutritionService
{
    Task<MealDto> LogMealAsync(Guid userId, MealLogRequest request);
    Task<ScanMealResponse> ScanMealAsync(Guid userId, ScanMealRequest request);
    Task<NutritionDayDto> GetDayNutritionAsync(Guid userId, DateTime date);
    Task<WeeklyNutritionSummaryDto> GetWeekSummaryAsync(Guid userId, DateTime weekStart);
    Task<NutritionTargetsDto> CalculateTargetsAsync(Guid userId);
    Task<bool> DeleteMealAsync(Guid mealId, Guid userId);
}
