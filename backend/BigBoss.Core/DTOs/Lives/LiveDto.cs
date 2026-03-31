using BigBoss.Core.Entities;

namespace BigBoss.Core.DTOs.Lives;

public class LiveDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public LiveType Type { get; set; }
    public DateTime ScheduledAt { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }
    public string? StreamUrl { get; set; }
    public string? ReplayUrl { get; set; }
    public string? ThumbnailUrl { get; set; }
    public string? ChaptersJson { get; set; }
    public int PeakViewers { get; set; }
    public int TotalViews { get; set; }
    public int TotalLikes { get; set; }
    public int TotalComments { get; set; }
    public Guid? GeneratedSessionId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class LiveListDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public LiveType Type { get; set; }
    public DateTime ScheduledAt { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }
    public string? ThumbnailUrl { get; set; }
    public int TotalViews { get; set; }
}

public class CreateLiveDto
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public LiveType Type { get; set; }
    public DateTime ScheduledAt { get; set; }
    public string? StreamUrl { get; set; }
    public string? ThumbnailUrl { get; set; }
    public Guid? GeneratedSessionId { get; set; }
}

public class UpdateLiveDto
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public LiveType? Type { get; set; }
    public DateTime? ScheduledAt { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }
    public string? StreamUrl { get; set; }
    public string? ReplayUrl { get; set; }
    public string? ThumbnailUrl { get; set; }
    public string? ChaptersJson { get; set; }
    public int? PeakViewers { get; set; }
    public int? TotalViews { get; set; }
    public int? TotalLikes { get; set; }
    public int? TotalComments { get; set; }
    public Guid? GeneratedSessionId { get; set; }
}
