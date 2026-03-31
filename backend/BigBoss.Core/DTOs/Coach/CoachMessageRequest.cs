using FluentValidation;

namespace BigBoss.Core.DTOs.Coach;

public record CoachMessageRequest(
    string Message,
    string? ImageBase64 = null,
    string? AudioBase64 = null,
    CoachContext? Context = null
);

public record CoachContext(
    bool IsInSession = false,
    Guid? CurrentSessionId = null,
    string? CurrentExerciseName = null
);

public class CoachMessageRequestValidator : AbstractValidator<CoachMessageRequest>
{
    public CoachMessageRequestValidator()
    {
        RuleFor(x => x.Message)
            .NotEmpty()
            .When(x => string.IsNullOrEmpty(x.ImageBase64) && string.IsNullOrEmpty(x.AudioBase64))
            .WithMessage("Un message, une image ou un audio est requis");

        RuleFor(x => x.Message)
            .MaximumLength(2000)
            .WithMessage("Le message ne peut pas depasser 2000 caracteres");
    }
}
