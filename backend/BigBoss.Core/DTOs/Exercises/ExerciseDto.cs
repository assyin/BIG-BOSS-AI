namespace BigBoss.Core.DTOs.Exercises;

public record ExerciseDto(
    Guid Id,
    string NameFr,
    string? NameEn,
    string? NameAr,
    string? NameDarija,
    string PrimaryMuscle,
    string Category,
    string Difficulty,
    string RequiredEquipment,
    string? VideoDemoUrl,
    string? ThumbnailUrl,
    string? GifPreviewUrl,
    bool IsActive,
    bool HasVideo = false
);

public record ExerciseListResponse(
    List<ExerciseDto> Items,
    int TotalCount,
    int Page,
    int PageSize
);
