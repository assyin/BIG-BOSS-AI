using BigBoss.Core.Enums;
using FluentValidation;

namespace BigBoss.Core.DTOs.Nutrition;

public record ScanMealRequest(
    string ImageBase64,
    MealType? MealType = null
);

public class ScanMealRequestValidator : AbstractValidator<ScanMealRequest>
{
    public ScanMealRequestValidator()
    {
        RuleFor(x => x.ImageBase64)
            .NotEmpty()
            .WithMessage("L'image est requise")
            .Must(BeValidBase64)
            .WithMessage("Format d'image invalide");
    }

    private bool BeValidBase64(string base64)
    {
        if (string.IsNullOrEmpty(base64)) return false;

        try
        {
            // Remove data URL prefix if present
            var data = base64;
            if (data.Contains(","))
            {
                data = data.Split(',')[1];
            }

            Convert.FromBase64String(data);
            return true;
        }
        catch
        {
            return false;
        }
    }
}

public record ScanMealResponse(
    List<DetectedFoodItem> DetectedItems,
    int EstimatedTotalCalories,
    decimal EstimatedProteinsG,
    decimal EstimatedCarbsG,
    decimal EstimatedFatsG,
    string AiAnalysis,
    decimal ConfidenceScore
);

public record DetectedFoodItem(
    string Name,
    string? NameAr,
    decimal EstimatedQuantityG,
    int Calories,
    decimal ProteinsG,
    decimal CarbsG,
    decimal FatsG,
    decimal Confidence
);
