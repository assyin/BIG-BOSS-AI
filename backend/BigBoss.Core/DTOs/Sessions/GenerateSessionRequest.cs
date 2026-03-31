using BigBoss.Core.Enums;
using FluentValidation;

namespace BigBoss.Core.DTOs.Sessions;

public record GenerateSessionRequest(
    MuscleGroup? PreferredMuscleGroup = null,
    int DurationMinutes = 60,
    int? EnergyLevel = null,        // 1-10
    int? SleepHours = null,
    List<Guid>? ExcludeExerciseIds = null,
    Equipment? AvailableEquipment = null
);

public class GenerateSessionRequestValidator : AbstractValidator<GenerateSessionRequest>
{
    public GenerateSessionRequestValidator()
    {
        RuleFor(x => x.DurationMinutes)
            .InclusiveBetween(15, 180)
            .WithMessage("La duree doit etre entre 15 et 180 minutes");

        RuleFor(x => x.EnergyLevel)
            .InclusiveBetween(1, 10)
            .When(x => x.EnergyLevel.HasValue)
            .WithMessage("Le niveau d'energie doit etre entre 1 et 10");

        RuleFor(x => x.SleepHours)
            .InclusiveBetween(0, 24)
            .When(x => x.SleepHours.HasValue)
            .WithMessage("Les heures de sommeil doivent etre entre 0 et 24");
    }
}
