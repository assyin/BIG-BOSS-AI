using BigBoss.Core.Enums;
using FluentValidation;

namespace BigBoss.Core.DTOs.Nutrition;

public record MealLogRequest(
    MealType MealType,
    List<FoodItemRequest> Items,
    DateTime? LoggedAt = null
);

public record FoodItemRequest(
    string Name,
    decimal QuantityG,
    int Calories,
    decimal ProteinsG,
    decimal CarbsG,
    decimal FatsG
);

public class MealLogRequestValidator : AbstractValidator<MealLogRequest>
{
    public MealLogRequestValidator()
    {
        RuleFor(x => x.Items)
            .NotEmpty()
            .WithMessage("Au moins un aliment est requis");

        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(x => x.Name)
                .NotEmpty()
                .MaximumLength(200);

            item.RuleFor(x => x.QuantityG)
                .GreaterThan(0)
                .LessThanOrEqualTo(5000);

            item.RuleFor(x => x.Calories)
                .GreaterThanOrEqualTo(0)
                .LessThanOrEqualTo(10000);
        });
    }
}
