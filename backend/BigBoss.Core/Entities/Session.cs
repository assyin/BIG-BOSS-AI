using BigBoss.Core.Enums;

namespace BigBoss.Core.Entities;

public class Session
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }

    // Session info
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public MuscleGroup PrimaryMuscleGroup { get; set; }
    public List<MuscleGroup> SecondaryMuscleGroups { get; set; } = new();

    // Timing
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int PlannedDurationMinutes { get; set; }
    public int? ActualDurationMinutes { get; set; }

    // Status
    public SessionStatus Status { get; set; } = SessionStatus.Generated;

    // Performance metrics
    public decimal? TotalVolumeKg { get; set; }
    public int? TotalSets { get; set; }
    public int? TotalReps { get; set; }
    public decimal? AverageIntensityPercent { get; set; }

    // Recovery
    public int? RecoveryScore { get; set; }
    public int? UserFatigueRating { get; set; }

    // AI context
    public string? AiPromptContext { get; set; }
    public string? AiResponseJson { get; set; }

    // Summary
    public string? AiSummary { get; set; }
    public List<string> PersonalRecords { get; set; } = new();
    public List<string> Recommendations { get; set; } = new();

    // Timestamps
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public virtual User User { get; set; } = null!;
    public virtual ICollection<SessionExercise> SessionExercises { get; set; } = new List<SessionExercise>();
}

public enum SessionStatus
{
    Generated = 0,
    InProgress = 1,
    Completed = 2,
    Abandoned = 3
}
