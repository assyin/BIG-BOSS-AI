namespace BigBoss.Core.DTOs.Exercises;

public record CreateExerciseDto
{
    public string NameFr { get; init; } = string.Empty;
    public string? NameEn { get; init; }
    public string? NameAr { get; init; }
    public string? NameDarija { get; init; }
    public string? DescriptionFr { get; init; }
    public string PrimaryMuscle { get; init; } = "Chest";
    public List<string>? SecondaryMuscles { get; init; }
    public string Difficulty { get; init; } = "Intermediate";
    public string RequiredEquipment { get; init; } = "Bodyweight";
    public string? VideoDemoUrl { get; init; }
    public string? ThumbnailUrl { get; init; }
    public List<string>? InstructionsEn { get; init; }
    public List<string>? InstructionsFr { get; init; }
    public List<string>? TipsEn { get; init; }
    public List<string>? TipsCoachFr { get; init; }
    public List<string>? ErreursCourantesFr { get; init; }
    public List<string>? CoachingCues { get; init; }
    public List<string>? CommonMistakes { get; init; }
    public bool IsActive { get; init; } = true;
}

public record UpdateExerciseDto : CreateExerciseDto;

public record ExerciseAdminDto(
    Guid Id,
    string NameFr,
    string? NameEn,
    string? NameAr,
    string? NameDarija,
    string? DescriptionFr,
    string PrimaryMuscle,
    List<string> SecondaryMuscles,
    string Difficulty,
    string RequiredEquipment,
    string? VideoDemoUrl,
    string? ThumbnailUrl,
    List<string> InstructionsEn,
    List<string> InstructionsFr,
    List<string> TipsEn,
    List<string> TipsCoachFr,
    List<string> ErreursCourantesFr,
    List<string> CoachingCues,
    List<string> CommonMistakes,
    bool IsActive,
    bool HasVideo,
    DateTime CreatedAt,
    DateTime UpdatedAt
);
