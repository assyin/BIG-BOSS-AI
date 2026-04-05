using FluentValidation;

namespace BigBoss.Core.DTOs.Auth;

public record RegisterRequest(
    string Email,
    string Password,
    string Name,
    string? Phone = null,
    string? ReferralCode = null
);

public class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("L'email est requis")
            .EmailAddress().WithMessage("Format d'email invalide");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Le mot de passe est requis")
            .MinimumLength(8).WithMessage("Le mot de passe doit contenir au moins 8 caracteres")
            .Matches(@"[A-Z]").WithMessage("Le mot de passe doit contenir au moins une majuscule")
            .Matches(@"[a-z]").WithMessage("Le mot de passe doit contenir au moins une minuscule")
            .Matches(@"[0-9]").WithMessage("Le mot de passe doit contenir au moins un chiffre");

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Le nom est requis")
            .MaximumLength(100).WithMessage("Le nom ne peut pas depasser 100 caracteres");

        RuleFor(x => x.Phone)
            .Matches(@"^\+?[0-9]{10,15}$")
            .When(x => !string.IsNullOrEmpty(x.Phone))
            .WithMessage("Format de telephone invalide");
    }
}
