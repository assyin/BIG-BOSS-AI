namespace BigBoss.Core.DTOs.Sessions;

public record SessionDto(
    Guid Id,
    string Title,
    string? Description,
    string PrimaryMuscleGroup,
    List<string> SecondaryMuscleGroups,
    int PlannedDurationMinutes,
    string Status,
    DateTime GeneratedAt,
    DateTime? StartedAt,
    DateTime? CompletedAt,
    List<SessionExerciseDto> Exercises,
    SessionStatsDto? Stats
);

public record SessionExerciseDto(
    Guid Id,
    Guid ExerciseId,
    string ExerciseName,
    string? ThumbnailUrl,
    string? VideoDemoUrl,
    int OrderIndex,
    int SetsPlanned,
    int RepsPlanned,
    decimal? WeightPlannedKg,
    int RestSecondsPlanned,
    bool IsCompleted,
    List<CompletedSetDto>? CompletedSets
);

public record CompletedSetDto(
    int SetNumber,
    int Reps,
    decimal WeightKg,
    int? FormScore
);

public record SessionStatsDto(
    decimal TotalVolumeKg,
    int TotalSets,
    int TotalReps,
    decimal? AverageFormScore,
    int ActualDurationMinutes
);
