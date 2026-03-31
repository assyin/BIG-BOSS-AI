using BigBoss.Core.Enums;

namespace BigBoss.Core.Entities;

public class Exercise
{
    public Guid Id { get; set; }

    // YMove source data
    public string? YmoveId { get; set; }
    public string? YmoveSlug { get; set; }
    public bool HasVideo { get; set; }

    // Names in multiple languages
    public string NameFr { get; set; } = string.Empty;
    public string? NameAr { get; set; }
    public string? NameDarija { get; set; }
    public string? NameEn { get; set; }

    // Description & Instructions
    public string? DescriptionFr { get; set; }
    public List<string> InstructionsEn { get; set; } = new();
    public List<string> InstructionsFr { get; set; } = new();
    public List<string> TipsEn { get; set; } = new();
    public List<string> TipsCoachFr { get; set; } = new();
    public List<string> ErreursCourantesFr { get; set; } = new();

    // Muscle targeting
    public MuscleGroup PrimaryMuscle { get; set; }
    public List<MuscleGroup> SecondaryMuscles { get; set; } = new();
    public MuscleGroup Category { get; set; }

    // Classification
    public DifficultyLevel Difficulty { get; set; }
    public Equipment RequiredEquipment { get; set; }

    // Video URLs
    public string? VideoDemoUrl { get; set; }
    public string? VideoLocalPath { get; set; }
    public string? VideoBunnyUrl { get; set; }
    public string? VideoFormUrl { get; set; }
    public string? VideoMistakesUrl { get; set; }
    public string? VideoTipsUrl { get; set; }
    public string? ThumbnailUrl { get; set; }
    public string? GifPreviewUrl { get; set; }

    // Coaching cues for AI
    public List<string> CoachingCues { get; set; } = new();
    public List<string> CommonMistakes { get; set; } = new();

    // Alternative exercises if equipment not available
    public List<Guid> AlternativeExerciseIds { get; set; } = new();

    // Recommended rep ranges
    public int MinRepsHypertrophy { get; set; } = 6;
    public int MaxRepsHypertrophy { get; set; } = 12;
    public int MinRepsStrength { get; set; } = 1;
    public int MaxRepsStrength { get; set; } = 5;
    public int MinRepsEndurance { get; set; } = 15;
    public int MaxRepsEndurance { get; set; } = 25;

    // Tempo (e.g., "3-1-2-0" = 3s eccentric, 1s pause, 2s concentric, 0s top)
    public string? RecommendedTempo { get; set; }

    // Technical complexity score (1-10)
    public int ComplexityScore { get; set; } = 5;

    // Safety
    public List<string> Contraindications { get; set; } = new();
    public List<string> RiskFactors { get; set; } = new();

    // Search tags
    public List<string> SearchTags { get; set; } = new();

    // Metadata
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public virtual ICollection<SessionExercise> SessionExercises { get; set; } = new List<SessionExercise>();
}
