using BigBoss.Core.Entities;

namespace BigBoss.Core.Interfaces;

public interface IShopService
{
    Task<List<ShopReward>> GetAvailableRewardsAsync(RewardCategory? category = null);
    Task<ShopReward?> GetRewardAsync(Guid rewardId);
    Task<RedeemResult> RedeemAsync(Guid userId, Guid rewardId, string? shippingAddress = null);
    Task<List<RewardRedemption>> GetUserRedemptionsAsync(Guid userId);

    // Admin
    Task<ShopReward> CreateRewardAsync(ShopReward reward);
    Task<ShopReward?> UpdateRewardAsync(Guid id, ShopReward updates);
    Task<List<RewardRedemption>> GetAllRedemptionsAsync(RedemptionStatus? status = null);
    Task<bool> UpdateRedemptionStatusAsync(Guid redemptionId, RedemptionStatus status, Guid adminId, string? notes = null);
}

public class RedeemResult
{
    public bool Success { get; set; }
    public string? Error { get; set; }
    public RewardRedemption? Redemption { get; set; }
}
