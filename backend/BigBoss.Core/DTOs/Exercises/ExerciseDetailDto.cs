namespace BigBoss.Core.DTOs.Exercises;

public record ExerciseDetailDto(
    Guid Id,
    string NameFr,
    string? NameAr,
    string? NameDarija,
    string? NameEn,
    string? DescriptionFr,
    string PrimaryMuscle,
    List<string> SecondaryMuscles,
    string Category,
    string Difficulty,
    List<string> RequiredEquipment,
    ExerciseVideosDto Videos,
    List<string> InstructionsFr,
    List<string> InstructionsEn,
    List<string> TipsCoachFr,
    List<string> TipsEn,
    List<string> ErreursCourantesFr,
    List<string> CoachingCues,
    List<string> CommonMistakes,
    List<Guid> AlternativeExerciseIds,
    RepRangesDto RepRanges,
    string? RecommendedTempo,
    int ComplexityScore,
    List<string> Contraindications,
    bool HasVideo,
    bool IsActive
);

public record ExerciseVideosDto(
    string? DemoUrl,
    string? FormUrl,
    string? MistakesUrl,
    string? TipsUrl,
    string? ThumbnailUrl,
    string? GifPreviewUrl
);

public record RepRangesDto(
    RepRangeDto Hypertrophy,
    RepRangeDto Strength,
    RepRangeDto Endurance
);

public record RepRangeDto(
    int Min,
    int Max
);
