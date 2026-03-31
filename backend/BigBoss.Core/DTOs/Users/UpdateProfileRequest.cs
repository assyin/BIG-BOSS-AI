using BigBoss.Core.Enums;
using FluentValidation;

namespace BigBoss.Core.DTOs.Users;

public record UpdateProfileRequest(
    string? Name,
    string? Phone,
    DateTime? BirthDate,
    decimal? WeightKg,
    decimal? HeightCm,
    string? Gender,
    UserGoal? Goal,
    DifficultyLevel? Level,
    Equipment? AvailableEquipment,
    string? PreferredLanguage,
    bool? NotificationsEnabled
);

public class UpdateProfileRequestValidator : AbstractValidator<UpdateProfileRequest>
{
    public UpdateProfileRequestValidator()
    {
        RuleFor(x => x.Name)
            .MaximumLength(100)
            .When(x => x.Name != null);

        RuleFor(x => x.WeightKg)
            .InclusiveBetween(20, 300)
            .When(x => x.WeightKg.HasValue)
            .WithMessage("Le poids doit etre entre 20 et 300 kg");

        RuleFor(x => x.HeightCm)
            .InclusiveBetween(100, 250)
            .When(x => x.HeightCm.HasValue)
            .WithMessage("La taille doit etre entre 100 et 250 cm");

        RuleFor(x => x.Gender)
            .Must(g => g == null || g == "male" || g == "female" || g == "other")
            .WithMessage("Genre invalide");

        RuleFor(x => x.PreferredLanguage)
            .Must(l => l == null || l == "fr" || l == "ar" || l == "darija")
            .WithMessage("Langue non supportee");
    }
}
