using BigBoss.Core.Enums;

namespace BigBoss.Core.Entities;

public class ShopReward
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public RewardCategory Category { get; set; }
    public int PointsCost { get; set; }
    public decimal? RealValueMad { get; set; }
    public int? Stock { get; set; } // null = unlimited
    public int? MaxPerUser { get; set; } // null = unlimited
    public SubscriptionTier? RequiredSubscriptionTier { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsFeatured { get; set; }
    public DateTime? ValidFrom { get; set; }
    public DateTime? ValidUntil { get; set; }
    public string? RedemptionInstructions { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public virtual ICollection<RewardRedemption> Redemptions { get; set; } = new List<RewardRedemption>();
}

public class RewardRedemption
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid ShopRewardId { get; set; }
    public int PointsSpent { get; set; }
    public RedemptionStatus Status { get; set; } = RedemptionStatus.Pending;
    public string? RedemptionCode { get; set; }
    public string? ShippingAddress { get; set; } // JSON
    public string? AdminNotes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ProcessedAt { get; set; }
    public Guid? ProcessedByAdminId { get; set; }

    public virtual User User { get; set; } = null!;
    public virtual ShopReward ShopReward { get; set; } = null!;
}

public enum RewardCategory
{
    Discount = 1,
    PhysicalProduct = 2,
    DigitalReward = 3,
    Subscription = 4,
    Experience = 5,
}

public enum RedemptionStatus
{
    Pending = 1,
    Confirmed = 2,
    Shipped = 3,
    Delivered = 4,
    Cancelled = 5,
    Refunded = 6,
}
