namespace BigBoss.Core.DTOs.ProgressPhotos;

public class ProgressPhotoDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public DateTime TakenAt { get; set; }
    public string StorageUrlEncrypted { get; set; } = string.Empty;
    public string PoseType { get; set; } = string.Empty;
    public string? AiAnalysisJson { get; set; }
    public decimal? EstimatedBodyFatPercent { get; set; }
    public bool IsSharedCommunity { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateProgressPhotoDto
{
    public DateTime? TakenAt { get; set; }
    public string StorageUrlEncrypted { get; set; } = string.Empty;
    public string PoseType { get; set; } = "front";
    public bool IsSharedCommunity { get; set; }
}

public class UpdateProgressPhotoDto
{
    public string? PoseType { get; set; }
    public string? AiAnalysisJson { get; set; }
    public decimal? EstimatedBodyFatPercent { get; set; }
    public bool? IsSharedCommunity { get; set; }
}
