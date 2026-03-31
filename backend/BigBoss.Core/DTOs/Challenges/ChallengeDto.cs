using BigBoss.Core.Entities;

namespace BigBoss.Core.DTOs.Challenges;

public class ChallengeDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public ChallengeType Type { get; set; }
    public string MetricName { get; set; } = string.Empty;
    public string MetricUnit { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string? RewardDescription { get; set; }
    public string? RewardImageUrl { get; set; }
    public bool IsActive { get; set; }
    public bool IsFeatured { get; set; }
    public int ParticipantsCount { get; set; }
    public decimal? UserProgress { get; set; }
    public int? UserRank { get; set; }
}

public class CreateChallengeDto
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public ChallengeType Type { get; set; }
    public string MetricName { get; set; } = string.Empty;
    public string MetricUnit { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string? RewardDescription { get; set; }
    public string? RewardImageUrl { get; set; }
    public bool IsFeatured { get; set; }
}

public class UpdateChallengeDto
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public string? MetricName { get; set; }
    public string? MetricUnit { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? RewardDescription { get; set; }
    public string? RewardImageUrl { get; set; }
    public bool? IsActive { get; set; }
    public bool? IsFeatured { get; set; }
}

public class ChallengeLeaderboardDto
{
    public Guid ChallengeId { get; set; }
    public string ChallengeTitle { get; set; } = string.Empty;
    public List<LeaderboardEntryDto> Entries { get; set; } = new();
}

public class LeaderboardEntryDto
{
    public int Rank { get; set; }
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string? UserAvatarUrl { get; set; }
    public decimal Progress { get; set; }
    public string FormattedProgress { get; set; } = string.Empty;
}
