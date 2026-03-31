namespace BigBoss.Core.DTOs.Sessions;

public record SessionSummaryDto(
    Guid SessionId,
    string Title,
    SummaryStatsDto Stats,
    List<PersonalRecordDto> NewPersonalRecords,
    ComparisonDto? ComparisonWithLastSession,
    List<string> AiRecommendations,
    string AiMotivationalMessage,
    NutritionRecommendationDto? PostWorkoutNutrition,
    DateTime? NextRecommendedWorkoutDate
);

public record SummaryStatsDto(
    int PlannedDurationMinutes,
    int ActualDurationMinutes,
    decimal TotalVolumeKg,
    int TotalSets,
    int TotalReps,
    decimal AverageIntensityPercent,
    decimal? AverageFormScore,
    int ExercisesCompleted,
    int ExercisesSkipped
);

public record PersonalRecordDto(
    string ExerciseName,
    string RecordType,   // "1RM", "Volume", "Reps"
    decimal PreviousValue,
    decimal NewValue,
    string Unit
);

public record ComparisonDto(
    decimal VolumeChangePercent,
    decimal IntensityChangePercent,
    int DurationChangeminutes
);

public record NutritionRecommendationDto(
    int RecommendedCalories,
    decimal RecommendedProteinG,
    List<string> SuggestedFoods
);
