using BigBoss.Core.Entities;
using BigBoss.Core.Interfaces;
using BigBoss.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BigBoss.Infrastructure.Services;

public class ChallengeParticipationService : IChallengeParticipationService
{
    private readonly BigBossDbContext _context;
    private readonly IPointsService _pointsService;
    private readonly ILogger<ChallengeParticipationService> _logger;

    public ChallengeParticipationService(BigBossDbContext context, IPointsService pointsService, ILogger<ChallengeParticipationService> logger)
    {
        _context = context;
        _pointsService = pointsService;
        _logger = logger;
    }

    public async Task<ChallengeParticipation> JoinChallengeAsync(Guid challengeId, Guid userId)
    {
        var challenge = await _context.Challenges.FindAsync(challengeId)
            ?? throw new KeyNotFoundException("Challenge non trouve");

        if (!challenge.IsActive || DateTime.UtcNow > challenge.EndDate)
            throw new InvalidOperationException("Ce challenge n'est plus actif");

        if (challenge.MaxParticipants.HasValue)
        {
            var count = await _context.ChallengeParticipations.CountAsync(p => p.ChallengeId == challengeId && !p.IsDisqualified);
            if (count >= challenge.MaxParticipants.Value)
                throw new InvalidOperationException("Challenge complet");
        }

        var existing = await _context.ChallengeParticipations
            .FirstOrDefaultAsync(p => p.ChallengeId == challengeId && p.UserId == userId);
        if (existing != null)
            throw new InvalidOperationException("Tu participes deja a ce challenge");

        var participation = new ChallengeParticipation
        {
            Id = Guid.NewGuid(),
            ChallengeId = challengeId,
            UserId = userId,
            JoinedAt = DateTime.UtcNow,
            CurrentProgress = 0
        };
        _context.ChallengeParticipations.Add(participation);
        await _context.SaveChangesAsync();

        // Award participation points
        if (challenge.PointsForParticipation > 0)
        {
            await _pointsService.AwardPointsAsync(new PointAwardRequest
            {
                UserId = userId,
                Amount = challenge.PointsForParticipation,
                Type = PointTransactionType.ChallengeParticipation,
                Reason = $"Rejoint le challenge: {challenge.Title}",
                IdempotencyKey = $"challenge_join:{challengeId}:{userId}",
                RelatedEntityId = challengeId,
                RelatedEntityType = "Challenge"
            });
        }

        _logger.LogInformation("User {UserId} joined challenge {ChallengeId}", userId, challengeId);
        return participation;
    }

    public async Task LeaveChallengeAsync(Guid challengeId, Guid userId)
    {
        var challenge = await _context.Challenges.FindAsync(challengeId)
            ?? throw new KeyNotFoundException("Challenge non trouve");

        if (DateTime.UtcNow > challenge.StartDate)
            throw new InvalidOperationException("Impossible de quitter un challenge en cours");

        var participation = await _context.ChallengeParticipations
            .FirstOrDefaultAsync(p => p.ChallengeId == challengeId && p.UserId == userId)
            ?? throw new KeyNotFoundException("Tu ne participes pas a ce challenge");

        _context.ChallengeParticipations.Remove(participation);
        await _context.SaveChangesAsync();
    }

    public async Task<ChallengeParticipation?> GetMyProgressAsync(Guid challengeId, Guid userId)
    {
        return await _context.ChallengeParticipations
            .AsNoTracking()
            .Include(p => p.Challenge)
            .FirstOrDefaultAsync(p => p.ChallengeId == challengeId && p.UserId == userId);
    }

    public async Task<List<LeaderboardEntry>> GetLeaderboardAsync(Guid challengeId, int top = 50)
    {
        var entries = await _context.ChallengeParticipations
            .AsNoTracking()
            .Where(p => p.ChallengeId == challengeId && !p.IsDisqualified)
            .OrderByDescending(p => p.CurrentProgress)
            .Take(top)
            .Join(_context.Users, p => p.UserId, u => u.Id, (p, u) => new LeaderboardEntry
            {
                UserId = p.UserId,
                UserName = u.Name,
                Progress = p.CurrentProgress,
                IsCompleted = p.IsCompleted,
            })
            .ToListAsync();

        for (int i = 0; i < entries.Count; i++)
            entries[i].Rank = i + 1;

        return entries;
    }

    public async Task<List<ChallengeParticipation>> GetMyChallengesAsync(Guid userId)
    {
        return await _context.ChallengeParticipations
            .AsNoTracking()
            .Include(p => p.Challenge)
            .Where(p => p.UserId == userId && !p.IsDisqualified)
            .OrderByDescending(p => p.JoinedAt)
            .ToListAsync();
    }

    public async Task UpdateProgressFromSessionAsync(Guid userId, Guid sessionId)
    {
        var session = await _context.Sessions
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId);
        if (session == null) return;

        var activeChallenges = await _context.ChallengeParticipations
            .Include(p => p.Challenge)
            .Where(p => p.UserId == userId && !p.IsDisqualified && !p.IsCompleted
                        && p.Challenge.IsActive && DateTime.UtcNow <= p.Challenge.EndDate)
            .ToListAsync();

        foreach (var participation in activeChallenges)
        {
            var challenge = participation.Challenge;
            decimal increment = challenge.Metric switch
            {
                ChallengeMetric.Volume => session.TotalVolumeKg ?? 0,
                ChallengeMetric.Sessions => 1,
                ChallengeMetric.Calories => 0, // TODO: from nutrition
                ChallengeMetric.PRCount => session.PersonalRecords?.Count ?? 0,
                _ => 0
            };

            if (increment > 0)
            {
                participation.CurrentProgress += increment;

                // Check completion
                if (challenge.TargetValue.HasValue && participation.CurrentProgress >= challenge.TargetValue.Value && !participation.IsCompleted)
                {
                    participation.IsCompleted = true;
                    participation.CompletedAt = DateTime.UtcNow;

                    if (challenge.PointsForCompletion > 0)
                    {
                        await _pointsService.AwardPointsAsync(new PointAwardRequest
                        {
                            UserId = userId,
                            Amount = challenge.PointsForCompletion,
                            Type = PointTransactionType.ChallengeCompletion,
                            Reason = $"Challenge termine: {challenge.Title}",
                            IdempotencyKey = $"challenge_complete:{challenge.Id}:{userId}",
                            RelatedEntityId = challenge.Id,
                            RelatedEntityType = "Challenge"
                        });
                    }
                }
            }
        }

        await _context.SaveChangesAsync();
    }

    public async Task FinalizeChallengeAsync(Guid challengeId)
    {
        var challenge = await _context.Challenges
            .Include(c => c.Participations)
            .FirstOrDefaultAsync(c => c.Id == challengeId)
            ?? throw new KeyNotFoundException("Challenge non trouve");

        if (challenge.IsFinalized) return;

        // Rank participants
        var ranked = challenge.Participations
            .Where(p => !p.IsDisqualified)
            .OrderByDescending(p => p.CurrentProgress)
            .ToList();

        for (int i = 0; i < ranked.Count; i++)
        {
            ranked[i].FinalRank = i + 1;

            // Award top 3 bonus
            if (i < 3 && challenge.PointsForTop3 > 0)
            {
                var bonus = challenge.PointsForTop3 / (i + 1); // 1st gets full, 2nd half, 3rd third
                ranked[i].PointsAwarded += bonus;
                await _pointsService.AwardPointsAsync(new PointAwardRequest
                {
                    UserId = ranked[i].UserId,
                    Amount = bonus,
                    Type = PointTransactionType.ChallengeTop3,
                    Reason = $"Top {i + 1} challenge: {challenge.Title}",
                    IdempotencyKey = $"challenge_top3:{challengeId}:{ranked[i].UserId}",
                    RelatedEntityId = challengeId,
                    RelatedEntityType = "Challenge"
                });
            }
        }

        challenge.IsFinalized = true;
        challenge.IsActive = false;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Challenge {ChallengeId} finalized with {Count} participants", challengeId, ranked.Count);
    }
}
