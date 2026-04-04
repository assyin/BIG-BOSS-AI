namespace BigBoss.Core.Entities;

public class AffiliationEvent
{
    public Guid Id { get; set; }
    public Guid ReferrerId { get; set; } // parrain
    public Guid RefereeId { get; set; }  // filleul
    public string ReferralCode { get; set; } = string.Empty;
    public AffiliationEventType EventType { get; set; }
    public int PointsAwarded { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? IpAddress { get; set; }
    public string? DeviceFingerprint { get; set; }
    public bool IsSuspicious { get; set; }

    public virtual User Referrer { get; set; } = null!;
    public virtual User Referee { get; set; } = null!;
}

public enum AffiliationEventType
{
    Registration = 1,
    FirstSession = 2,
    SubscriptionPurchase = 3,
}
