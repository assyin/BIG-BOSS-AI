using FluentValidation;

namespace BigBoss.Core.DTOs.Sessions;

public record LogSetRequest(
    Guid SessionExerciseId,
    int Reps,
    decimal WeightKg,
    int? FormScore = null,
    int? RestSeconds = null,
    string? Notes = null
);

public class LogSetRequestValidator : AbstractValidator<LogSetRequest>
{
    public LogSetRequestValidator()
    {
        RuleFor(x => x.SessionExerciseId)
            .NotEmpty()
            .WithMessage("L'ID de l'exercice est requis");

        RuleFor(x => x.Reps)
            .InclusiveBetween(1, 100)
            .WithMessage("Les repetitions doivent etre entre 1 et 100");

        RuleFor(x => x.WeightKg)
            .InclusiveBetween(0, 500)
            .WithMessage("Le poids doit etre entre 0 et 500 kg");

        RuleFor(x => x.FormScore)
            .InclusiveBetween(0, 100)
            .When(x => x.FormScore.HasValue)
            .WithMessage("Le score de forme doit etre entre 0 et 100");

        RuleFor(x => x.RestSeconds)
            .InclusiveBetween(0, 600)
            .When(x => x.RestSeconds.HasValue)
            .WithMessage("Le temps de repos doit etre entre 0 et 600 secondes");
    }
}

public record SkipExerciseRequest(
    Guid SessionExerciseId,
    string? Reason = null
);
