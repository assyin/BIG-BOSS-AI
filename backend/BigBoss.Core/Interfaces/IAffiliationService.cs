using BigBoss.Core.Entities;

namespace BigBoss.Core.Interfaces;

public interface IAffiliationService
{
    Task<string> GetOrCreateReferralCodeAsync(Guid userId);
    Task ProcessReferralAsync(Guid refereeId, string referralCode, string? ipAddress = null);
    Task ProcessFirstSessionBonusAsync(Guid userId);
    Task<AffiliationStats> GetStatsAsync(Guid userId);
    Task<List<ReferralInfo>> GetReferralsAsync(Guid userId);
}

public class AffiliationStats
{
    public string ReferralCode { get; set; } = string.Empty;
    public int TotalReferrals { get; set; }
    public int ActiveReferrals { get; set; }
    public int TotalPointsEarned { get; set; }
    public int PendingPoints { get; set; }
}

public class ReferralInfo
{
    public string Name { get; set; } = string.Empty;
    public DateTime JoinedAt { get; set; }
    public bool HasCompletedFirstSession { get; set; }
    public int PointsEarned { get; set; }
}
