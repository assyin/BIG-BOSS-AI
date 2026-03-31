namespace BigBoss.Core.DTOs.BodyStats;

public class BodyStatDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public DateTime RecordedAt { get; set; }
    public decimal? WeightKg { get; set; }
    public decimal? BodyFatPercent { get; set; }
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
    public string? Notes { get; set; }
}

public class CreateBodyStatDto
{
    public DateTime? RecordedAt { get; set; }
    public decimal? WeightKg { get; set; }
    public decimal? BodyFatPercent { get; set; }
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
    public string? Notes { get; set; }
}

public class UpdateBodyStatDto
{
    public DateTime? RecordedAt { get; set; }
    public decimal? WeightKg { get; set; }
    public decimal? BodyFatPercent { get; set; }
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
    public string? Notes { get; set; }
}
