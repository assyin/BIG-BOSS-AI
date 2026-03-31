namespace BigBoss.Core.Entities;

public class SessionExercise
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public Guid ExerciseId { get; set; }

    // Order in session
    public int OrderIndex { get; set; }

    // Planned values
    public int SetsPlanned { get; set; }
    public int RepsPlanned { get; set; }
    public decimal? WeightPlannedKg { get; set; }
    public int RestSecondsPlanned { get; set; } = 90;

    // Actual completed values
    public int SetsCompleted { get; set; }
    public List<int> RepsCompleted { get; set; } = new();
    public List<decimal> WeightsCompletedKg { get; set; } = new();
    public List<int> RestSecondsActual { get; set; } = new();

    // Form analysis (from vision AI or self-report)
    public List<int> FormScores { get; set; } = new(); // 0-100 per set
    public decimal? AverageFormScore { get; set; }

    // Notes
    public string? UserNotes { get; set; }
    public string? AiNotes { get; set; }

    // Status
    public bool IsCompleted { get; set; }
    public bool IsSkipped { get; set; }
    public string? SkipReason { get; set; }

    // Timestamps
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    // Navigation
    public virtual Session Session { get; set; } = null!;
    public virtual Exercise Exercise { get; set; } = null!;
}
