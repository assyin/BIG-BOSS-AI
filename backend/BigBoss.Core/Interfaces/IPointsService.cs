using BigBoss.Core.Entities;

namespace BigBoss.Core.Interfaces;

public interface IPointsService
{
    Task<PointAwardResult> AwardPointsAsync(PointAwardRequest request);
    Task<bool> SpendPointsAsync(Guid userId, int amount, string reason, Guid? relatedEntityId = null, string? relatedEntityType = null);
    Task<PointsBalanceDto> GetBalanceAsync(Guid userId);
    Task<List<PointTransaction>> GetHistoryAsync(Guid userId, int page = 1, int pageSize = 20, PointTransactionType? type = null);
    Task<Dictionary<string, int>> GetMonthlySummaryAsync(Guid userId);
    Task ReconcileBalanceAsync(Guid userId);
}

public class PointAwardRequest
{
    public Guid UserId { get; set; }
    public int Amount { get; set; }
    public PointTransactionType Type { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string IdempotencyKey { get; set; } = string.Empty;
    public Guid? RelatedEntityId { get; set; }
    public string? RelatedEntityType { get; set; }
}

public class PointAwardResult
{
    public bool Awarded { get; set; }
    public int PointsAwarded { get; set; }
    public int NewBalance { get; set; }
    public string? SkipReason { get; set; } // "duplicate", "daily_cap", "validation_failed"
}

public class PointsBalanceDto
{
    public int Balance { get; set; }
    public int TotalEarned { get; set; }
    public int TotalSpent { get; set; }
    public int CurrentStreak { get; set; }
    public int LongestStreak { get; set; }
}
