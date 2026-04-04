namespace BigBoss.Core.Entities;

public class ChallengeParticipation
{
    public Guid Id { get; set; }
    public Guid ChallengeId { get; set; }
    public Guid UserId { get; set; }
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    public decimal CurrentProgress { get; set; }
    public bool IsCompleted { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int? FinalRank { get; set; }
    public int PointsAwarded { get; set; }
    public bool IsDisqualified { get; set; }
    public string? DisqualifyReason { get; set; }

    // Navigation
    public virtual Challenge Challenge { get; set; } = null!;
    public virtual User User { get; set; } = null!;
}
