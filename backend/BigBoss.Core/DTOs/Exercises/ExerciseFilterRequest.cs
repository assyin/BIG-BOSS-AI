using BigBoss.Core.Enums;
using FluentValidation;

namespace BigBoss.Core.DTOs.Exercises;

public record ExerciseFilterRequest(
    MuscleGroup? MuscleGroup = null,
    DifficultyLevel? Difficulty = null,
    Equipment? Equipment = null,
    string? SearchQuery = null,
    int Page = 1,
    int PageSize = 20
);

public class ExerciseFilterRequestValidator : AbstractValidator<ExerciseFilterRequest>
{
    public ExerciseFilterRequestValidator()
    {
        RuleFor(x => x.Page)
            .GreaterThan(0)
            .WithMessage("La page doit etre superieure a 0");

        RuleFor(x => x.PageSize)
            .InclusiveBetween(1, 100)
            .WithMessage("La taille de page doit etre entre 1 et 100");

        RuleFor(x => x.SearchQuery)
            .MaximumLength(100)
            .When(x => x.SearchQuery != null);
    }
}
