using BigBoss.Core.Entities;
using BigBoss.Core.Interfaces;
using BigBoss.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BigBoss.Infrastructure.Services;

public class StreakService : IStreakService
{
    private readonly BigBossDbContext _context;
    private readonly IPointsService _pointsService;
    private readonly IGamificationConfigService _config;
    private readonly IPushNotificationService _pushService;
    private readonly ILogger<StreakService> _logger;

    public StreakService(BigBossDbContext context, IPointsService pointsService, IGamificationConfigService config, IPushNotificationService pushService, ILogger<StreakService> logger)
    {
        _context = context;
        _pointsService = pointsService;
        _config = config;
        _pushService = pushService;
        _logger = logger;
    }

    public async Task RecordActivityAsync(Guid userId)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return;

        var today = DateTime.UtcNow.Date;
        var gracePeriodHours = await _config.GetIntAsync("streak.grace_period_hours", 36);

        if (user.LastActivityDate.HasValue && user.LastActivityDate.Value.Date == today)
            return; // Already recorded today

        var previousDate = user.LastActivityDate;

        if (previousDate.HasValue)
        {
            var hoursSinceLast = (DateTime.UtcNow - previousDate.Value).TotalHours;

            if (hoursSinceLast <= gracePeriodHours)
            {
                // Streak continues
                user.CurrentStreak++;
            }
            else
            {
                // Streak broken
                user.CurrentStreak = 1;
            }
        }
        else
        {
            // First ever activity
            user.CurrentStreak = 1;
        }

        if (user.CurrentStreak > user.LongestStreak)
            user.LongestStreak = user.CurrentStreak;

        user.LastActivityDate = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        // Check streak milestones
        await CheckStreakMilestonesAsync(userId, user.CurrentStreak);

        _logger.LogInformation("Streak updated for user {UserId}: {Streak} days", userId, user.CurrentStreak);
    }

    public async Task<StreakInfo> GetStreakAsync(Guid userId)
    {
        var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return new StreakInfo();

        var gracePeriodHours = await _config.GetIntAsync("streak.grace_period_hours", 36);
        var isActive = user.LastActivityDate.HasValue &&
                       (DateTime.UtcNow - user.LastActivityDate.Value).TotalHours <= gracePeriodHours;

        return new StreakInfo
        {
            CurrentStreak = isActive ? user.CurrentStreak : 0,
            LongestStreak = user.LongestStreak,
            LastActivityDate = user.LastActivityDate,
            IsActiveToday = user.LastActivityDate?.Date == DateTime.UtcNow.Date
        };
    }

    public async Task<List<DateTime>> GetActivityCalendarAsync(Guid userId, int year, int month)
    {
        var startDate = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
        var endDate = startDate.AddMonths(1);

        // Get dates when sessions were completed
        var dates = await _context.Sessions
            .AsNoTracking()
            .Where(s => s.UserId == userId && s.Status == SessionStatus.Completed &&
                        s.CompletedAt.HasValue && s.CompletedAt >= startDate && s.CompletedAt < endDate)
            .Select(s => s.CompletedAt!.Value.Date)
            .Distinct()
            .ToListAsync();

        return dates;
    }

    private async Task CheckStreakMilestonesAsync(Guid userId, int streak)
    {
        var milestones = new Dictionary<int, string>
        {
            { 7, "streak.bonus_7d" },
            { 30, "streak.bonus_30d" },
            { 100, "streak.bonus_100d" }
        };

        if (milestones.TryGetValue(streak, out var configKey))
        {
            var bonus = await _config.GetIntAsync(configKey.Replace("bonus", "points"), streak switch
            {
                7 => 50,
                30 => 300,
                100 => 1000,
                _ => 0
            });

            if (bonus > 0)
            {
                await _pointsService.AwardPointsAsync(new PointAwardRequest
                {
                    UserId = userId,
                    Amount = bonus,
                    Type = PointTransactionType.StreakBonus,
                    Reason = $"Streak {streak} jours!",
                    IdempotencyKey = $"streak_bonus:{userId}:{streak}"
                });
            }

            // Push notification for milestone (non-blocking)
            try
            {
                var emoji = streak switch { 7 => "🔥", 30 => "💪", 100 => "🏆", _ => "✨" };
                await _pushService.SendToUserAsync(userId,
                    $"{emoji} Streak {streak} jours !",
                    bonus > 0
                        ? $"Bravo champion ! +{bonus} points bonus"
                        : $"Continue comme ça, tu es un vrai bekhi !");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send streak milestone push for user {UserId}", userId);
            }
        }
    }
}
