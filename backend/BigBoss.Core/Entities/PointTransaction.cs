namespace BigBoss.Core.Entities;

public class PointTransaction
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public int Amount { get; set; } // positive = earning, negative = spending
    public PointTransactionType Type { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string IdempotencyKey { get; set; } = string.Empty; // unique, prevents duplicates
    public Guid? RelatedEntityId { get; set; }
    public string? RelatedEntityType { get; set; } // "Session", "Challenge", "ShopOrder"
    public int BalanceAfter { get; set; } // cached balance snapshot
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Guid? CreatedByAdminId { get; set; } // only for AdminAdjustment/Clawback

    // Navigation
    public virtual User User { get; set; } = null!;
}

public enum PointTransactionType
{
    SessionComplete = 1,
    StreakBonus = 2,
    PRBonus = 3,
    MacrosRespected = 4,
    MealLogged = 5,
    FeedShared = 6,
    ReviewPosted = 7,
    LiveWatched = 8,
    ChallengeParticipation = 9,
    ChallengeCompletion = 10,
    ChallengeTop3 = 11,
    AffiliationReferrer = 12,
    AffiliationReferee = 13,
    PhotoLogged = 14,
    StatLogged = 15,
    ShopPurchase = 20, // negative
    AdminAdjustment = 90,
    Clawback = 91, // negative, reversal
}
