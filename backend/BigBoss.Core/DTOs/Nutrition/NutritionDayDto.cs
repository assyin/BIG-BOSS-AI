namespace BigBoss.Core.DTOs.Nutrition;

public record NutritionDayDto(
    DateTime Date,
    NutritionTargetsDto Targets,
    NutritionTotalsDto Consumed,
    NutritionTotalsDto Remaining,
    List<MealDto> Meals,
    decimal CompliancePercent
);

public record NutritionTargetsDto(
    int Calories,
    decimal ProteinsG,
    decimal CarbsG,
    decimal FatsG
);

public record NutritionTotalsDto(
    int Calories,
    decimal ProteinsG,
    decimal CarbsG,
    decimal FatsG
);

public record MealDto(
    Guid Id,
    string MealType,
    DateTime LoggedAt,
    string? PhotoUrl,
    List<FoodItemDto> Items,
    int TotalCalories,
    decimal ProteinsG,
    decimal CarbsG,
    decimal FatsG
);

public record FoodItemDto(
    string Name,
    decimal QuantityG,
    int Calories,
    decimal ProteinsG,
    decimal CarbsG,
    decimal FatsG
);

public record WeeklyNutritionSummaryDto(
    DateTime WeekStart,
    DateTime WeekEnd,
    decimal AverageCalories,
    decimal AverageProteinsG,
    decimal AverageCarbsG,
    decimal AverageFatsG,
    decimal AverageCompliancePercent,
    List<DailyComplianceDto> DailyCompliance
);

public record DailyComplianceDto(
    DateTime Date,
    decimal CompliancePercent,
    bool MealsLogged
);
