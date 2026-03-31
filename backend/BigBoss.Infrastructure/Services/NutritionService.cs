using System.Text.Json;
using BigBoss.Core.DTOs.Nutrition;
using BigBoss.Core.Entities;
using BigBoss.Core.Enums;
using BigBoss.Core.Interfaces;
using BigBoss.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BigBoss.Infrastructure.Services;

public class NutritionService : INutritionService
{
    private readonly BigBossDbContext _context;
    private readonly IClaudeService _claudeService;
    private readonly IUserService _userService;
    private readonly ILogger<NutritionService> _logger;

    public NutritionService(
        BigBossDbContext context,
        IClaudeService claudeService,
        IUserService userService,
        ILogger<NutritionService> logger)
    {
        _context = context;
        _claudeService = claudeService;
        _userService = userService;
        _logger = logger;
    }

    public async Task<MealDto> LogMealAsync(Guid userId, MealLogRequest request)
    {
        var meal = new Meal
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            MealType = request.MealType,
            LoggedAt = request.LoggedAt ?? DateTime.UtcNow,
            ItemsJson = JsonSerializer.Serialize(request.Items),
            TotalCalories = request.Items.Sum(i => i.Calories),
            ProteinsG = request.Items.Sum(i => i.ProteinsG),
            CarbsG = request.Items.Sum(i => i.CarbsG),
            FatsG = request.Items.Sum(i => i.FatsG),
            WasScanned = false
        };

        _context.Meals.Add(meal);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Meal logged for user {UserId}: {MealType}", userId, request.MealType);

        return MapToMealDto(meal);
    }

    public async Task<ScanMealResponse> ScanMealAsync(Guid userId, ScanMealRequest request)
    {
        // Check subscription tier for scan limit
        var user = await _userService.GetByIdAsync(userId);
        if (user == null) throw new KeyNotFoundException("Utilisateur non trouve");

        // Count today's scans
        var todayScans = await _context.Meals
            .CountAsync(m => m.UserId == userId &&
                             m.WasScanned &&
                             m.LoggedAt.Date == DateTime.UtcNow.Date);

        var maxScans = user.SubscriptionTier switch
        {
            SubscriptionTier.Free => 0,
            SubscriptionTier.Premium => 10,
            SubscriptionTier.Elite => int.MaxValue,
            _ => 0
        };

        if (todayScans >= maxScans)
        {
            throw new InvalidOperationException("Limite de scans atteinte pour aujourd'hui");
        }

        // Analyze image with AI
        var aiResponse = await _claudeService.AnalyzeMealImageAsync(request.ImageBase64);

        // Parse AI response
        var aiData = JsonDocument.Parse(aiResponse).RootElement;

        var detectedItems = new List<DetectedFoodItem>();
        if (aiData.TryGetProperty("items", out var items))
        {
            foreach (var item in items.EnumerateArray())
            {
                detectedItems.Add(new DetectedFoodItem(
                    Name: item.GetProperty("name").GetString() ?? "",
                    NameAr: item.TryGetProperty("name_ar", out var nameAr) ? nameAr.GetString() : null,
                    EstimatedQuantityG: item.GetProperty("estimated_quantity_g").GetDecimal(),
                    Calories: item.GetProperty("calories").GetInt32(),
                    ProteinsG: item.GetProperty("proteins_g").GetDecimal(),
                    CarbsG: item.GetProperty("carbs_g").GetDecimal(),
                    FatsG: item.GetProperty("fats_g").GetDecimal(),
                    Confidence: item.TryGetProperty("confidence", out var conf) ? conf.GetDecimal() : 0.8m
                ));
            }
        }

        return new ScanMealResponse(
            DetectedItems: detectedItems,
            EstimatedTotalCalories: aiData.TryGetProperty("total_calories", out var cal) ? cal.GetInt32() : 0,
            EstimatedProteinsG: aiData.TryGetProperty("total_proteins_g", out var prot) ? prot.GetDecimal() : 0,
            EstimatedCarbsG: aiData.TryGetProperty("total_carbs_g", out var carbs) ? carbs.GetDecimal() : 0,
            EstimatedFatsG: aiData.TryGetProperty("total_fats_g", out var fats) ? fats.GetDecimal() : 0,
            AiAnalysis: aiData.TryGetProperty("analysis", out var analysis) ? analysis.GetString() ?? "" : "",
            ConfidenceScore: aiData.TryGetProperty("confidence_score", out var score) ? score.GetDecimal() : 0.8m
        );
    }

    public async Task<NutritionDayDto> GetDayNutritionAsync(Guid userId, DateTime date)
    {
        var targets = await CalculateTargetsAsync(userId);

        var dayStart = DateTime.SpecifyKind(date.Date, DateTimeKind.Utc);
        var dayEnd = dayStart.AddDays(1);

        var meals = await _context.Meals
            .AsNoTracking()
            .Where(m => m.UserId == userId && m.LoggedAt >= dayStart && m.LoggedAt < dayEnd)
            .OrderBy(m => m.LoggedAt)
            .ToListAsync();

        var consumed = new NutritionTotalsDto(
            Calories: meals.Sum(m => m.TotalCalories),
            ProteinsG: meals.Sum(m => m.ProteinsG),
            CarbsG: meals.Sum(m => m.CarbsG),
            FatsG: meals.Sum(m => m.FatsG)
        );

        var remaining = new NutritionTotalsDto(
            Calories: Math.Max(0, targets.Calories - consumed.Calories),
            ProteinsG: Math.Max(0, targets.ProteinsG - consumed.ProteinsG),
            CarbsG: Math.Max(0, targets.CarbsG - consumed.CarbsG),
            FatsG: Math.Max(0, targets.FatsG - consumed.FatsG)
        );

        var compliance = targets.Calories > 0
            ? Math.Min(100, (decimal)consumed.Calories / targets.Calories * 100)
            : 0;

        return new NutritionDayDto(
            Date: date.Date,
            Targets: targets,
            Consumed: consumed,
            Remaining: remaining,
            Meals: meals.Select(MapToMealDto).ToList(),
            CompliancePercent: compliance
        );
    }

    public async Task<WeeklyNutritionSummaryDto> GetWeekSummaryAsync(Guid userId, DateTime weekStart)
    {
        var weekEnd = weekStart.AddDays(7);

        var meals = await _context.Meals
            .AsNoTracking()
            .Where(m => m.UserId == userId &&
                        m.LoggedAt >= weekStart &&
                        m.LoggedAt < weekEnd)
            .ToListAsync();

        var dailyData = meals
            .GroupBy(m => m.LoggedAt.Date)
            .Select(g => new
            {
                Date = g.Key,
                Calories = g.Sum(m => m.TotalCalories),
                Proteins = g.Sum(m => m.ProteinsG),
                Carbs = g.Sum(m => m.CarbsG),
                Fats = g.Sum(m => m.FatsG)
            })
            .ToList();

        var targets = await CalculateTargetsAsync(userId);

        var dailyCompliance = Enumerable.Range(0, 7)
            .Select(i =>
            {
                var date = weekStart.AddDays(i);
                var dayData = dailyData.FirstOrDefault(d => d.Date == date);
                return new DailyComplianceDto(
                    Date: date,
                    CompliancePercent: dayData != null && targets.Calories > 0
                        ? Math.Min(100, (decimal)dayData.Calories / targets.Calories * 100)
                        : 0,
                    MealsLogged: dayData != null
                );
            })
            .ToList();

        return new WeeklyNutritionSummaryDto(
            WeekStart: weekStart,
            WeekEnd: weekEnd.AddDays(-1),
            AverageCalories: dailyData.Any() ? (decimal)dailyData.Average(d => d.Calories) : 0,
            AverageProteinsG: dailyData.Any() ? (decimal)dailyData.Average(d => d.Proteins) : 0,
            AverageCarbsG: dailyData.Any() ? (decimal)dailyData.Average(d => d.Carbs) : 0,
            AverageFatsG: dailyData.Any() ? (decimal)dailyData.Average(d => d.Fats) : 0,
            AverageCompliancePercent: dailyCompliance.Any() ? (decimal)dailyCompliance.Average(d => d.CompliancePercent) : 0,
            DailyCompliance: dailyCompliance
        );
    }

    public async Task<NutritionTargetsDto> CalculateTargetsAsync(Guid userId)
    {
        var user = await _userService.GetByIdAsync(userId);
        if (user == null) throw new KeyNotFoundException("Utilisateur non trouve");

        // Calculate TDEE using Mifflin-St Jeor
        decimal bmr;
        if (user.WeightKg.HasValue && user.HeightCm.HasValue && user.BirthDate.HasValue)
        {
            var age = DateTime.UtcNow.Year - user.BirthDate.Value.Year;
            var weight = user.WeightKg.Value;
            var height = user.HeightCm.Value;

            if (user.Gender == "female")
            {
                bmr = (10 * weight) + (6.25m * height) - (5 * age) - 161;
            }
            else
            {
                bmr = (10 * weight) + (6.25m * height) - (5 * age) + 5;
            }
        }
        else
        {
            bmr = 1800; // Default
        }

        // Activity multiplier (assuming moderate activity)
        var tdee = bmr * 1.55m;

        // Adjust based on goal
        var targetCalories = user.Goal switch
        {
            UserGoal.LoseFat => (int)(tdee - 400),
            UserGoal.BuildMuscle => (int)(tdee + 300),
            _ => (int)tdee
        };

        // Calculate macros
        var proteinG = (user.WeightKg ?? 70) * 2.0m; // 2g/kg
        var fatG = (user.WeightKg ?? 70) * 1.0m;     // 1g/kg
        var proteinCalories = proteinG * 4;
        var fatCalories = fatG * 9;
        var carbCalories = targetCalories - proteinCalories - fatCalories;
        var carbG = carbCalories / 4;

        return new NutritionTargetsDto(
            Calories: targetCalories,
            ProteinsG: proteinG,
            CarbsG: Math.Max(0, carbG),
            FatsG: fatG
        );
    }

    public async Task<bool> DeleteMealAsync(Guid mealId, Guid userId)
    {
        var meal = await _context.Meals
            .FirstOrDefaultAsync(m => m.Id == mealId && m.UserId == userId);

        if (meal == null) return false;

        _context.Meals.Remove(meal);
        await _context.SaveChangesAsync();
        return true;
    }

    private MealDto MapToMealDto(Meal meal)
    {
        var items = new List<FoodItemDto>();
        try
        {
            var itemsData = JsonSerializer.Deserialize<List<FoodItemRequest>>(meal.ItemsJson);
            if (itemsData != null)
            {
                items = itemsData.Select(i => new FoodItemDto(
                    i.Name, i.QuantityG, i.Calories, i.ProteinsG, i.CarbsG, i.FatsG
                )).ToList();
            }
        }
        catch { }

        return new MealDto(
            Id: meal.Id,
            MealType: meal.MealType.ToString(),
            LoggedAt: meal.LoggedAt,
            PhotoUrl: meal.PhotoUrl,
            Items: items,
            TotalCalories: meal.TotalCalories,
            ProteinsG: meal.ProteinsG,
            CarbsG: meal.CarbsG,
            FatsG: meal.FatsG
        );
    }
}
