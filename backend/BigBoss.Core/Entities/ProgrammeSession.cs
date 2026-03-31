namespace BigBoss.Core.Entities;

public class ProgrammeSession
{
    public Guid Id { get; set; }
    public Guid ProgrammeId { get; set; }
    public int WeekNumber { get; set; }
    public int DayOfWeek { get; set; } // 0=Mon, 6=Sun
    public DateTime PlannedDate { get; set; }
    public string Title { get; set; } = string.Empty;
    public List<string> MuscleGroups { get; set; } = new();
    public string ExercisesJson { get; set; } = "[]";
    public int EstimatedDuration { get; set; } = 60;
    public int OrderInWeek { get; set; }

    // Link to actual session when executed
    public Guid? SessionId { get; set; }
    public ProgrammeSessionStatus Status { get; set; } = ProgrammeSessionStatus.Planned;
    public DateTime? CompletedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public virtual Programme Programme { get; set; } = null!;
    public virtual Session? Session { get; set; }
}

public enum ProgrammeSessionStatus
{
    Planned = 1,
    InProgress = 2,
    Completed = 3,
    Missed = 4,
    Skipped = 5
}
