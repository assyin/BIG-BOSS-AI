using BigBoss.Core.Entities;
using BigBoss.Core.Interfaces;
using BigBoss.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BigBoss.Infrastructure.Services;

public class PointsService : IPointsService
{
    private readonly BigBossDbContext _context;
    private readonly IGamificationConfigService _config;
    private readonly ILogger<PointsService> _logger;

    public PointsService(BigBossDbContext context, IGamificationConfigService config, ILogger<PointsService> logger)
    {
        _context = context;
        _config = config;
        _logger = logger;
    }

    public async Task<PointAwardResult> AwardPointsAsync(PointAwardRequest request)
    {
        // 1. Idempotency check
        if (!string.IsNullOrEmpty(request.IdempotencyKey))
        {
            var exists = await _context.PointTransactions
                .AnyAsync(t => t.IdempotencyKey == request.IdempotencyKey);
            if (exists)
                return new PointAwardResult { Awarded = false, SkipReason = "duplicate" };
        }

        // 2. Daily cap check
        var dailyCap = await _config.GetIntAsync("points.daily_cap", 200);
        var todayStart = DateTime.UtcNow.Date;
        var todayEarned = await _context.PointTransactions
            .Where(t => t.UserId == request.UserId && t.Amount > 0 && t.CreatedAt >= todayStart)
            .SumAsync(t => t.Amount);

        if (todayEarned + request.Amount > dailyCap)
        {
            var remaining = dailyCap - todayEarned;
            if (remaining <= 0)
                return new PointAwardResult { Awarded = false, SkipReason = "daily_cap" };
            request.Amount = remaining; // Award partial
        }

        // 3. Category-specific daily limit
        var categoryLimit = await GetCategoryDailyLimit(request.Type);
        if (categoryLimit > 0)
        {
            var categoryCount = await _context.PointTransactions
                .CountAsync(t => t.UserId == request.UserId && t.Type == request.Type && t.CreatedAt >= todayStart);
            if (categoryCount >= categoryLimit)
                return new PointAwardResult { Awarded = false, SkipReason = "category_limit" };
        }

        // 4. Award points within transaction
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == request.UserId);
            if (user == null)
                return new PointAwardResult { Awarded = false, SkipReason = "user_not_found" };

            user.PointsBalance += request.Amount;
            user.TotalPointsEarned += request.Amount;
            user.UpdatedAt = DateTime.UtcNow;

            var tx = new PointTransaction
            {
                Id = Guid.NewGuid(),
                UserId = request.UserId,
                Amount = request.Amount,
                Type = request.Type,
                Reason = request.Reason,
                IdempotencyKey = request.IdempotencyKey ?? $"{request.Type}:{Guid.NewGuid()}",
                RelatedEntityId = request.RelatedEntityId,
                RelatedEntityType = request.RelatedEntityType,
                BalanceAfter = user.PointsBalance,
                CreatedAt = DateTime.UtcNow
            };
            _context.PointTransactions.Add(tx);

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            _logger.LogInformation("Points awarded: {Amount} to user {UserId} for {Type}. New balance: {Balance}",
                request.Amount, request.UserId, request.Type, user.PointsBalance);

            return new PointAwardResult
            {
                Awarded = true,
                PointsAwarded = request.Amount,
                NewBalance = user.PointsBalance
            };
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<bool> SpendPointsAsync(Guid userId, int amount, string reason, Guid? relatedEntityId = null, string? relatedEntityType = null)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null || user.PointsBalance < amount)
                return false;

            user.PointsBalance -= amount;
            user.TotalPointsSpent += amount;
            user.UpdatedAt = DateTime.UtcNow;

            var tx = new PointTransaction
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Amount = -amount,
                Type = PointTransactionType.ShopPurchase,
                Reason = reason,
                IdempotencyKey = $"spend:{Guid.NewGuid()}",
                RelatedEntityId = relatedEntityId,
                RelatedEntityType = relatedEntityType,
                BalanceAfter = user.PointsBalance,
                CreatedAt = DateTime.UtcNow
            };
            _context.PointTransactions.Add(tx);

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            _logger.LogInformation("Points spent: {Amount} by user {UserId}. New balance: {Balance}", amount, userId, user.PointsBalance);
            return true;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<PointsBalanceDto> GetBalanceAsync(Guid userId)
    {
        var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return new PointsBalanceDto();

        return new PointsBalanceDto
        {
            Balance = user.PointsBalance,
            TotalEarned = user.TotalPointsEarned,
            TotalSpent = user.TotalPointsSpent,
            CurrentStreak = user.CurrentStreak,
            LongestStreak = user.LongestStreak
        };
    }

    public async Task<List<PointTransaction>> GetHistoryAsync(Guid userId, int page = 1, int pageSize = 20, PointTransactionType? type = null)
    {
        var query = _context.PointTransactions
            .AsNoTracking()
            .Where(t => t.UserId == userId);

        if (type.HasValue)
            query = query.Where(t => t.Type == type.Value);

        return await query
            .OrderByDescending(t => t.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task<Dictionary<string, int>> GetMonthlySummaryAsync(Guid userId)
    {
        var startOfMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var groups = await _context.PointTransactions
            .AsNoTracking()
            .Where(t => t.UserId == userId && t.CreatedAt >= startOfMonth && t.Amount > 0)
            .GroupBy(t => t.Type)
            .Select(g => new { Type = g.Key.ToString(), Total = g.Sum(t => t.Amount) })
            .ToListAsync();

        return groups.ToDictionary(g => g.Type, g => g.Total);
    }

    public async Task ReconcileBalanceAsync(Guid userId)
    {
        var actualBalance = await _context.PointTransactions
            .Where(t => t.UserId == userId)
            .SumAsync(t => t.Amount);

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user != null && user.PointsBalance != actualBalance)
        {
            _logger.LogWarning("Balance mismatch for user {UserId}: cached={Cached}, actual={Actual}",
                userId, user.PointsBalance, actualBalance);
            user.PointsBalance = actualBalance;
            await _context.SaveChangesAsync();
        }
    }

    private async Task<int> GetCategoryDailyLimit(PointTransactionType type)
    {
        return type switch
        {
            PointTransactionType.SessionComplete => await _config.GetIntAsync("points.session_max_daily", 3),
            PointTransactionType.MealLogged => await _config.GetIntAsync("points.meal_max_daily", 5),
            PointTransactionType.FeedShared => 1,
            PointTransactionType.ReviewPosted => 1,
            _ => 0 // no limit
        };
    }
}
