using BigBoss.Core.Entities;
using BigBoss.Core.Interfaces;
using BigBoss.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BigBoss.Infrastructure.Services;

public class AffiliationService : IAffiliationService
{
    private readonly BigBossDbContext _context;
    private readonly IPointsService _pointsService;
    private readonly IGamificationConfigService _config;
    private readonly ILogger<AffiliationService> _logger;

    public AffiliationService(BigBossDbContext context, IPointsService pointsService, IGamificationConfigService config, ILogger<AffiliationService> logger)
    {
        _context = context;
        _pointsService = pointsService;
        _config = config;
        _logger = logger;
    }

    public async Task<string> GetOrCreateReferralCodeAsync(Guid userId)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) throw new KeyNotFoundException("User not found");

        if (!string.IsNullOrEmpty(user.ReferralCode))
            return user.ReferralCode;

        // Generate unique 8-char code
        string code;
        do
        {
            code = GenerateCode();
        } while (await _context.Users.AnyAsync(u => u.ReferralCode == code));

        user.ReferralCode = code;
        await _context.SaveChangesAsync();
        return code;
    }

    public async Task ProcessReferralAsync(Guid refereeId, string referralCode, string? ipAddress = null)
    {
        if (string.IsNullOrWhiteSpace(referralCode)) return;

        var referrer = await _context.Users.FirstOrDefaultAsync(u => u.ReferralCode == referralCode);
        if (referrer == null) return;
        if (referrer.Id == refereeId) return; // can't self-refer

        // Check if already processed
        var exists = await _context.AffiliationEvents
            .AnyAsync(e => e.ReferrerId == referrer.Id && e.RefereeId == refereeId && e.EventType == AffiliationEventType.Registration);
        if (exists) return;

        // Velocity check
        var maxPerMonth = await _config.GetIntAsync("affiliation.max_referrals_month", 20);
        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var monthCount = await _context.AffiliationEvents
            .CountAsync(e => e.ReferrerId == referrer.Id && e.CreatedAt >= monthStart);
        if (monthCount >= maxPerMonth)
        {
            _logger.LogWarning("Referral velocity limit reached for user {ReferrerId}", referrer.Id);
            return;
        }

        // Suspicious check: same IP
        bool suspicious = false;
        if (!string.IsNullOrEmpty(ipAddress))
        {
            var sameIp = await _context.AffiliationEvents
                .AnyAsync(e => e.ReferrerId == referrer.Id && e.IpAddress == ipAddress);
            if (sameIp) suspicious = true;
        }

        // Set referrer on referee
        var referee = await _context.Users.FirstOrDefaultAsync(u => u.Id == refereeId);
        if (referee != null)
            referee.ReferredByUserId = referrer.Id;

        // Create event
        var evt = new AffiliationEvent
        {
            Id = Guid.NewGuid(),
            ReferrerId = referrer.Id,
            RefereeId = refereeId,
            ReferralCode = referralCode,
            EventType = AffiliationEventType.Registration,
            IpAddress = ipAddress,
            IsSuspicious = suspicious,
            CreatedAt = DateTime.UtcNow,
        };

        // Award immediate partial points to referrer (25% now)
        if (!suspicious)
        {
            var totalReferrerPoints = await _config.GetIntAsync("points.affiliation_referrer", 200);
            var immediatePoints = totalReferrerPoints / 4; // 25% now
            evt.PointsAwarded = immediatePoints;

            await _pointsService.AwardPointsAsync(new PointAwardRequest
            {
                UserId = referrer.Id,
                Amount = immediatePoints,
                Type = PointTransactionType.AffiliationReferrer,
                Reason = $"Parrainage: inscription de {referee?.Name ?? "nouvel utilisateur"}",
                IdempotencyKey = $"affiliation_reg:{referrer.Id}:{refereeId}",
            });

            // Award points to referee
            var refereePoints = await _config.GetIntAsync("points.affiliation_referee", 50);
            if (refereePoints > 0)
            {
                await _pointsService.AwardPointsAsync(new PointAwardRequest
                {
                    UserId = refereeId,
                    Amount = refereePoints,
                    Type = PointTransactionType.AffiliationReferee,
                    Reason = "Bonus de bienvenue (parrainage)",
                    IdempotencyKey = $"affiliation_welcome:{refereeId}",
                });
            }
        }

        _context.AffiliationEvents.Add(evt);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Referral processed: {ReferrerId} -> {RefereeId} (suspicious: {Suspicious})",
            referrer.Id, refereeId, suspicious);
    }

    public async Task ProcessFirstSessionBonusAsync(Guid userId)
    {
        // Find who referred this user
        var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (user?.ReferredByUserId == null) return;

        var referrerId = user.ReferredByUserId.Value;

        // Check if first session bonus already given
        var exists = await _context.AffiliationEvents
            .AnyAsync(e => e.ReferrerId == referrerId && e.RefereeId == userId && e.EventType == AffiliationEventType.FirstSession);
        if (exists) return;

        // Check if registration was suspicious
        var regEvent = await _context.AffiliationEvents
            .FirstOrDefaultAsync(e => e.ReferrerId == referrerId && e.RefereeId == userId && e.EventType == AffiliationEventType.Registration);
        if (regEvent?.IsSuspicious == true) return;

        // Award remaining 75% to referrer
        var totalReferrerPoints = await _config.GetIntAsync("points.affiliation_referrer", 200);
        var deferredPoints = totalReferrerPoints - (totalReferrerPoints / 4); // 75%

        var evt = new AffiliationEvent
        {
            Id = Guid.NewGuid(),
            ReferrerId = referrerId,
            RefereeId = userId,
            ReferralCode = regEvent?.ReferralCode ?? "",
            EventType = AffiliationEventType.FirstSession,
            PointsAwarded = deferredPoints,
            CreatedAt = DateTime.UtcNow,
        };
        _context.AffiliationEvents.Add(evt);

        await _pointsService.AwardPointsAsync(new PointAwardRequest
        {
            UserId = referrerId,
            Amount = deferredPoints,
            Type = PointTransactionType.AffiliationReferrer,
            Reason = $"Parrainage: {user.Name} a complete sa premiere seance!",
            IdempotencyKey = $"affiliation_first_session:{referrerId}:{userId}",
        });

        await _context.SaveChangesAsync();
        _logger.LogInformation("First session bonus awarded to referrer {ReferrerId} for {RefereeId}", referrerId, userId);
    }

    public async Task<AffiliationStats> GetStatsAsync(Guid userId)
    {
        var code = await GetOrCreateReferralCodeAsync(userId);

        var events = await _context.AffiliationEvents.AsNoTracking()
            .Where(e => e.ReferrerId == userId)
            .ToListAsync();

        var refereeIds = events.Select(e => e.RefereeId).Distinct().ToList();
        var activeCount = await _context.Sessions
            .Where(s => refereeIds.Contains(s.UserId) && s.Status == SessionStatus.Completed)
            .Select(s => s.UserId)
            .Distinct()
            .CountAsync();

        return new AffiliationStats
        {
            ReferralCode = code,
            TotalReferrals = refereeIds.Count,
            ActiveReferrals = activeCount,
            TotalPointsEarned = events.Sum(e => e.PointsAwarded),
            PendingPoints = events.Where(e => e.EventType == AffiliationEventType.Registration)
                .Count(e => !events.Any(e2 => e2.RefereeId == e.RefereeId && e2.EventType == AffiliationEventType.FirstSession))
                * ((await _config.GetIntAsync("points.affiliation_referrer", 200)) * 3 / 4),
        };
    }

    public async Task<List<ReferralInfo>> GetReferralsAsync(Guid userId)
    {
        var events = await _context.AffiliationEvents.AsNoTracking()
            .Where(e => e.ReferrerId == userId && e.EventType == AffiliationEventType.Registration)
            .ToListAsync();

        var firstSessionEvents = await _context.AffiliationEvents.AsNoTracking()
            .Where(e => e.ReferrerId == userId && e.EventType == AffiliationEventType.FirstSession)
            .Select(e => e.RefereeId)
            .ToListAsync();

        var refereeIds = events.Select(e => e.RefereeId).ToList();
        var referees = await _context.Users.AsNoTracking()
            .Where(u => refereeIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id);

        return events.Select(e =>
        {
            var referee = referees.GetValueOrDefault(e.RefereeId);
            var hasFirstSession = firstSessionEvents.Contains(e.RefereeId);
            var allEvents = _context.AffiliationEvents.AsNoTracking()
                .Where(ev => ev.ReferrerId == userId && ev.RefereeId == e.RefereeId)
                .Sum(ev => ev.PointsAwarded);

            return new ReferralInfo
            {
                Name = referee?.Name ?? "Utilisateur",
                JoinedAt = e.CreatedAt,
                HasCompletedFirstSession = hasFirstSession,
                PointsEarned = allEvents,
            };
        }).ToList();
    }

    private static string GenerateCode()
    {
        const string chars = "ABCDEFGHIJKLMNPQRSTUVWXYZ23456789";
        var random = new Random();
        return new string(Enumerable.Range(0, 8).Select(_ => chars[random.Next(chars.Length)]).ToArray());
    }
}
