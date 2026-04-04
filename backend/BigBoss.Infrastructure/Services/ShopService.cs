using BigBoss.Core.Entities;
using BigBoss.Core.Interfaces;
using BigBoss.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BigBoss.Infrastructure.Services;

public class ShopService : IShopService
{
    private readonly BigBossDbContext _context;
    private readonly IPointsService _pointsService;
    private readonly ILogger<ShopService> _logger;

    public ShopService(BigBossDbContext context, IPointsService pointsService, ILogger<ShopService> logger)
    {
        _context = context;
        _pointsService = pointsService;
        _logger = logger;
    }

    public async Task<List<ShopReward>> GetAvailableRewardsAsync(RewardCategory? category = null)
    {
        var now = DateTime.UtcNow;
        var query = _context.ShopRewards.AsNoTracking()
            .Where(r => r.IsActive)
            .Where(r => !r.ValidFrom.HasValue || r.ValidFrom <= now)
            .Where(r => !r.ValidUntil.HasValue || r.ValidUntil >= now)
            .Where(r => !r.Stock.HasValue || r.Stock > 0);

        if (category.HasValue)
            query = query.Where(r => r.Category == category.Value);

        return await query.OrderByDescending(r => r.IsFeatured).ThenBy(r => r.PointsCost).ToListAsync();
    }

    public async Task<ShopReward?> GetRewardAsync(Guid rewardId)
    {
        return await _context.ShopRewards.AsNoTracking().FirstOrDefaultAsync(r => r.Id == rewardId);
    }

    public async Task<RedeemResult> RedeemAsync(Guid userId, Guid rewardId, string? shippingAddress = null)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var reward = await _context.ShopRewards.FirstOrDefaultAsync(r => r.Id == rewardId);
            if (reward == null || !reward.IsActive)
                return new RedeemResult { Success = false, Error = "Recompense non disponible" };

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null)
                return new RedeemResult { Success = false, Error = "Utilisateur non trouve" };

            // Check balance
            if (user.PointsBalance < reward.PointsCost)
                return new RedeemResult { Success = false, Error = $"Solde insuffisant ({user.PointsBalance}/{reward.PointsCost} pts)" };

            // Check stock (optimistic concurrency)
            if (reward.Stock.HasValue)
            {
                if (reward.Stock <= 0)
                    return new RedeemResult { Success = false, Error = "Rupture de stock" };
                reward.Stock--;
            }

            // Check max per user
            if (reward.MaxPerUser.HasValue)
            {
                var userCount = await _context.RewardRedemptions
                    .CountAsync(r => r.UserId == userId && r.ShopRewardId == rewardId && r.Status != RedemptionStatus.Cancelled && r.Status != RedemptionStatus.Refunded);
                if (userCount >= reward.MaxPerUser.Value)
                    return new RedeemResult { Success = false, Error = "Limite atteinte pour cette recompense" };
            }

            // Spend points
            var spent = await _pointsService.SpendPointsAsync(userId, reward.PointsCost, $"Echange: {reward.Title}", rewardId, "ShopReward");
            if (!spent)
                return new RedeemResult { Success = false, Error = "Echec de debit des points" };

            // Create redemption
            var redemption = new RewardRedemption
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                ShopRewardId = rewardId,
                PointsSpent = reward.PointsCost,
                Status = RedemptionStatus.Pending,
                RedemptionCode = GenerateRedemptionCode(),
                ShippingAddress = shippingAddress,
                CreatedAt = DateTime.UtcNow
            };
            _context.RewardRedemptions.Add(redemption);

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            _logger.LogInformation("Reward redeemed: {RewardId} by user {UserId} for {Points} pts", rewardId, userId, reward.PointsCost);

            return new RedeemResult { Success = true, Redemption = redemption };
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<List<RewardRedemption>> GetUserRedemptionsAsync(Guid userId)
    {
        return await _context.RewardRedemptions.AsNoTracking()
            .Include(r => r.ShopReward)
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();
    }

    // Admin methods
    public async Task<ShopReward> CreateRewardAsync(ShopReward reward)
    {
        reward.Id = Guid.NewGuid();
        reward.CreatedAt = DateTime.UtcNow;
        _context.ShopRewards.Add(reward);
        await _context.SaveChangesAsync();
        return reward;
    }

    public async Task<ShopReward?> UpdateRewardAsync(Guid id, ShopReward updates)
    {
        var reward = await _context.ShopRewards.FindAsync(id);
        if (reward == null) return null;

        reward.Title = updates.Title;
        reward.Description = updates.Description;
        reward.ImageUrl = updates.ImageUrl;
        reward.Category = updates.Category;
        reward.PointsCost = updates.PointsCost;
        reward.RealValueMad = updates.RealValueMad;
        reward.Stock = updates.Stock;
        reward.MaxPerUser = updates.MaxPerUser;
        reward.IsActive = updates.IsActive;
        reward.IsFeatured = updates.IsFeatured;
        reward.RedemptionInstructions = updates.RedemptionInstructions;
        reward.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return reward;
    }

    public async Task<List<RewardRedemption>> GetAllRedemptionsAsync(RedemptionStatus? status = null)
    {
        var query = _context.RewardRedemptions.AsNoTracking()
            .Include(r => r.ShopReward)
            .Include(r => r.User)
            .AsQueryable();

        if (status.HasValue)
            query = query.Where(r => r.Status == status.Value);

        return await query.OrderByDescending(r => r.CreatedAt).ToListAsync();
    }

    public async Task<bool> UpdateRedemptionStatusAsync(Guid redemptionId, RedemptionStatus status, Guid adminId, string? notes = null)
    {
        var redemption = await _context.RewardRedemptions.FindAsync(redemptionId);
        if (redemption == null) return false;

        // If cancelling/refunding, restore points
        if ((status == RedemptionStatus.Cancelled || status == RedemptionStatus.Refunded) && redemption.Status != RedemptionStatus.Cancelled && redemption.Status != RedemptionStatus.Refunded)
        {
            await _pointsService.AwardPointsAsync(new PointAwardRequest
            {
                UserId = redemption.UserId,
                Amount = redemption.PointsSpent,
                Type = PointTransactionType.AdminAdjustment,
                Reason = $"Remboursement: {status}",
                IdempotencyKey = $"refund:{redemption.Id}"
            });

            // Restore stock
            var reward = await _context.ShopRewards.FindAsync(redemption.ShopRewardId);
            if (reward?.Stock.HasValue == true) reward.Stock++;
        }

        redemption.Status = status;
        redemption.AdminNotes = notes;
        redemption.ProcessedAt = DateTime.UtcNow;
        redemption.ProcessedByAdminId = adminId;
        redemption.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    private static string GenerateRedemptionCode()
    {
        return $"BBF-{Guid.NewGuid().ToString("N")[..8].ToUpper()}";
    }
}
