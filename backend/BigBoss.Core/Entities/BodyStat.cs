namespace BigBoss.Core.Entities;

public class BodyStat
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }

    // Date of measurement
    public DateTime RecordedAt { get; set; } = DateTime.UtcNow;

    // Weight
    public decimal? WeightKg { get; set; }

    // Body fat
    public decimal? BodyFatPercent { get; set; }

    // Measurements (cm)
    public decimal? ChestCm { get; set; }
    public decimal? WaistCm { get; set; }
    public decimal? HipsCm { get; set; }
    public decimal? LeftArmCm { get; set; }
    public decimal? RightArmCm { get; set; }
    public decimal? LeftThighCm { get; set; }
    public decimal? RightThighCm { get; set; }
    public decimal? LeftCalfCm { get; set; }
    public decimal? RightCalfCm { get; set; }
    public decimal? ShouldersCm { get; set; }
    public decimal? NeckCm { get; set; }

    // Notes
    public string? Notes { get; set; }

    // Navigation
    public virtual User User { get; set; } = null!;
}
