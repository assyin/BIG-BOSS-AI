namespace BigBoss.Core.Entities;

public class Programme
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ProgrammeType Type { get; set; }
    public int DurationWeeks { get; set; } = 12;
    public int CurrentWeek { get; set; } = 1;
    public string Split { get; set; } = "Full Body";

    // Nutrition targets
    public int DailyCalories { get; set; }
    public decimal DailyProtein { get; set; }
    public decimal DailyCarbs { get; set; }
    public decimal DailyFat { get; set; }
    public string? MealPlanJson { get; set; }

    // Status
    public ProgrammeStatus Status { get; set; } = ProgrammeStatus.Active;
    public DateTime StartDate { get; set; } = DateTime.UtcNow;
    public DateTime? EndDate { get; set; }
    public int CompletedSessions { get; set; }
    public int TotalSessions { get; set; }
    public decimal ProgressPercent { get; set; }

    // Schedule
    public string? WeeklyScheduleJson { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public virtual User User { get; set; } = null!;
    public virtual ICollection<ProgrammeSession> ProgrammeSessions { get; set; } = new List<ProgrammeSession>();
}

public enum ProgrammeType
{
    Mass = 1,
    Cut = 2,
    Strength = 3,
    Endurance = 4,
    Recomp = 5,
    Health = 6
}

public enum ProgrammeStatus
{
    Active = 1,
    Completed = 2,
    Paused = 3,
    Abandoned = 4
}
