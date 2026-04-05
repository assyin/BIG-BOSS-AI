using BigBoss.Core.Entities;
using BigBoss.Core.Interfaces;
using BigBoss.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BigBoss.Infrastructure.Services;

public class AchievementService : IAchievementService
{
    private readonly BigBossDbContext _context;
    private readonly IPointsService _pointsService;
    private readonly IPushNotificationService _pushService;
    private readonly ILogger<AchievementService> _logger;

    public AchievementService(BigBossDbContext context, IPointsService pointsService, IPushNotificationService pushService, ILogger<AchievementService> logger)
    {
        _context = context;
        _pointsService = pointsService;
        _pushService = pushService;
        _logger = logger;
    }

    public async Task<List<AchievementWithStatus>> GetAllForUserAsync(Guid userId)
    {
        var achievements = await _context.Achievements.AsNoTracking()
            .Where(a => a.IsActive)
            .OrderBy(a => a.SortOrder)
            .ToListAsync();

        var unlocked = await _context.UserAchievements.AsNoTracking()
            .Where(ua => ua.UserId == userId)
            .ToDictionaryAsync(ua => ua.AchievementId, ua => ua);

        var userStats = await GetUserStatsAsync(userId);

        return achievements.Select(a =>
        {
            var isUnlocked = unlocked.ContainsKey(a.Id);
            var currentValue = GetCurrentValue(a.TriggerType, userStats);
            var progress = a.TriggerValue > 0 ? Math.Min((decimal)currentValue / a.TriggerValue * 100, 100) : 0;

            return new AchievementWithStatus
            {
                Id = a.Id,
                Key = a.Key,
                Title = a.Title,
                TitleAr = a.TitleAr,
                Description = a.Description,
                IconUrl = a.IconUrl,
                Category = (int)a.Category,
                PointsReward = a.PointsReward,
                IsUnlocked = isUnlocked,
                UnlockedAt = isUnlocked ? unlocked[a.Id].UnlockedAt : null,
                Progress = progress,
                CurrentValue = currentValue,
                TargetValue = a.TriggerValue,
            };
        }).ToList();
    }

    public async Task<List<UserAchievement>> GetUnlockedAsync(Guid userId)
    {
        return await _context.UserAchievements.AsNoTracking()
            .Include(ua => ua.Achievement)
            .Where(ua => ua.UserId == userId)
            .OrderByDescending(ua => ua.UnlockedAt)
            .ToListAsync();
    }

    public async Task<List<UserAchievement>> CheckAndAwardAsync(Guid userId)
    {
        var achievements = await _context.Achievements.AsNoTracking()
            .Where(a => a.IsActive)
            .ToListAsync();

        var alreadyUnlocked = await _context.UserAchievements
            .Where(ua => ua.UserId == userId)
            .Select(ua => ua.AchievementId)
            .ToListAsync();
        var alreadyUnlockedSet = new HashSet<Guid>(alreadyUnlocked);

        var userStats = await GetUserStatsAsync(userId);
        var newUnlocks = new List<UserAchievement>();

        foreach (var achievement in achievements)
        {
            if (alreadyUnlockedSet.Contains(achievement.Id)) continue;

            var currentValue = GetCurrentValue(achievement.TriggerType, userStats);
            if (currentValue >= achievement.TriggerValue)
            {
                var ua = new UserAchievement
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    AchievementId = achievement.Id,
                    UnlockedAt = DateTime.UtcNow,
                    PointsAwarded = achievement.PointsReward,
                };
                _context.UserAchievements.Add(ua);
                newUnlocks.Add(ua);

                if (achievement.PointsReward > 0)
                {
                    await _pointsService.AwardPointsAsync(new PointAwardRequest
                    {
                        UserId = userId,
                        Amount = achievement.PointsReward,
                        Type = PointTransactionType.StreakBonus, // reuse for achievement rewards
                        Reason = $"Achievement: {achievement.Title}",
                        IdempotencyKey = $"achievement:{achievement.Id}:{userId}",
                    });
                }

                _logger.LogInformation("Achievement unlocked: {Key} for user {UserId}", achievement.Key, userId);

                // Push notification
                try
                {
                    await _pushService.SendToUserAsync(userId,
                        "Badge debloque! 🏆",
                        $"{achievement.Title} - +{achievement.PointsReward} points");
                }
                catch { }
            }
        }

        if (newUnlocks.Any())
            await _context.SaveChangesAsync();

        return newUnlocks;
    }

    private async Task<UserStatsForAchievements> GetUserStatsAsync(Guid userId)
    {
        var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return new UserStatsForAchievements();

        var completedSessions = await _context.Sessions
            .CountAsync(s => s.UserId == userId && s.Status == SessionStatus.Completed);

        var totalVolume = await _context.Sessions
            .Where(s => s.UserId == userId && s.Status == SessionStatus.Completed)
            .SumAsync(s => s.TotalVolumeKg ?? 0);

        var prCount = await _context.Sessions
            .Where(s => s.UserId == userId && s.Status == SessionStatus.Completed && s.PersonalRecords != null)
            .SumAsync(s => s.PersonalRecords!.Count);

        var mealCount = await _context.Meals.CountAsync(m => m.UserId == userId);

        var referralCount = await _context.Users.CountAsync(u => u.ReferredByUserId == userId);

        return new UserStatsForAchievements
        {
            Sessions = completedSessions,
            Streak = user.CurrentStreak,
            LongestStreak = user.LongestStreak,
            Volume = totalVolume,
            PRCount = prCount,
            Meals = mealCount,
            Referrals = referralCount,
        };
    }

    private static int GetCurrentValue(string triggerType, UserStatsForAchievements stats)
    {
        return triggerType.ToLower() switch
        {
            "sessions" => stats.Sessions,
            "streak" => stats.LongestStreak,
            "volume" => (int)stats.Volume,
            "pr_count" => stats.PRCount,
            "meals" => stats.Meals,
            "referrals" => stats.Referrals,
            _ => 0,
        };
    }

    private class UserStatsForAchievements
    {
        public int Sessions { get; set; }
        public int Streak { get; set; }
        public int LongestStreak { get; set; }
        public decimal Volume { get; set; }
        public int PRCount { get; set; }
        public int Meals { get; set; }
        public int Referrals { get; set; }
    }
}
