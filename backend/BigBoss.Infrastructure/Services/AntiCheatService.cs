using BigBoss.Core.Entities;
using BigBoss.Core.Interfaces;
using BigBoss.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace BigBoss.Infrastructure.Services;

public class AntiCheatService : IAntiCheatService
{
    private readonly BigBossDbContext _context;
    private readonly IGamificationConfigService _config;
    private readonly ILogger<AntiCheatService> _logger;

    // In-memory flag storage (in production, use a dedicated table)
    private static readonly Dictionary<Guid, List<FlagEntry>> _flagStore = new();

    public AntiCheatService(BigBossDbContext context, IGamificationConfigService config, ILogger<AntiCheatService> logger)
    {
        _context = context;
        _config = config;
        _logger = logger;
    }

    public async Task<bool> ValidateSessionForPointsAsync(Guid userId, Guid sessionId)
    {
        var session = await _context.Sessions.AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId);

        if (session == null) return false;

        var minDuration = await _config.GetIntAsync("points.session_min_duration", 15);
        var minExercises = await _config.GetIntAsync("points.session_min_exercises", 3);

        // Check duration
        if ((session.ActualDurationMinutes ?? 0) < minDuration)
        {
            await FlagUserAsync(userId, $"Session trop courte: {session.ActualDurationMinutes}min (min: {minDuration})", "session");
            return false;
        }

        // Check exercise count
        var exerciseCount = await _context.SessionExercises
            .CountAsync(se => se.SessionId == sessionId && se.IsCompleted);
        if (exerciseCount < minExercises)
        {
            await FlagUserAsync(userId, $"Trop peu d'exercices: {exerciseCount} (min: {minExercises})", "session");
            return false;
        }

        // Velocity check: too many sessions in 24h
        var maxVelocity = await _config.GetIntAsync("anticheat.session_velocity_max", 5);
        var oneDayAgo = DateTime.UtcNow.AddDays(-1);
        var recentCount = await _context.Sessions
            .CountAsync(s => s.UserId == userId && s.Status == SessionStatus.Completed && s.CompletedAt > oneDayAgo);

        if (recentCount > maxVelocity)
        {
            await FlagUserAsync(userId, $"Velocity: {recentCount} sessions en 24h (max: {maxVelocity})", "session");
            return false;
        }

        return true;
    }

    public Task FlagUserAsync(Guid userId, string reason, string source)
    {
        lock (_flagStore)
        {
            if (!_flagStore.ContainsKey(userId))
                _flagStore[userId] = new List<FlagEntry>();

            _flagStore[userId].Add(new FlagEntry
            {
                Reason = reason,
                Source = source,
                CreatedAt = DateTime.UtcNow,
            });
        }

        _logger.LogWarning("Anti-cheat flag: user {UserId} - {Reason} [{Source}]", userId, reason, source);
        return Task.CompletedTask;
    }

    public async Task<List<FlaggedUser>> GetFlaggedUsersAsync(string? status = null)
    {
        List<FlaggedUser> result;

        lock (_flagStore)
        {
            var userIds = _flagStore.Keys.ToList();
            result = userIds.Select(uid => new FlaggedUser
            {
                UserId = uid,
                Flags = _flagStore[uid].OrderByDescending(f => f.CreatedAt).ToList(),
                SuspicionScore = Math.Min(_flagStore[uid].Count * 20, 100),
            }).ToList();
        }

        // Enrich with user data
        var ids = result.Select(r => r.UserId).ToList();
        var users = await _context.Users.AsNoTracking()
            .Where(u => ids.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id);

        foreach (var r in result)
        {
            if (users.TryGetValue(r.UserId, out var user))
            {
                r.UserName = user.Name;
                r.Email = user.Email;
                r.IsSuspended = user.IsSuspended;
            }
        }

        if (status == "suspended")
            result = result.Where(r => r.IsSuspended).ToList();
        else if (status == "active")
            result = result.Where(r => !r.IsSuspended).ToList();

        return result.OrderByDescending(r => r.SuspicionScore).ToList();
    }

    public async Task ResolveFlag(Guid userId, string resolution, Guid adminId)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return;

        switch (resolution.ToLower())
        {
            case "innocent":
                lock (_flagStore) { _flagStore.Remove(userId); }
                _logger.LogInformation("User {UserId} cleared by admin {AdminId}", userId, adminId);
                break;

            case "disqualify":
                // Remove from active challenges
                var participations = await _context.ChallengeParticipations
                    .Where(p => p.UserId == userId && !p.IsDisqualified)
                    .ToListAsync();
                foreach (var p in participations)
                {
                    p.IsDisqualified = true;
                    p.DisqualifyReason = "Anti-triche";
                }
                await _context.SaveChangesAsync();
                lock (_flagStore) { _flagStore.Remove(userId); }
                _logger.LogWarning("User {UserId} disqualified from challenges by admin {AdminId}", userId, adminId);
                break;

            case "ban":
                user.IsSuspended = true;
                user.SuspendedReason = "Anti-triche: compte suspendu";
                await _context.SaveChangesAsync();
                _logger.LogWarning("User {UserId} BANNED by admin {AdminId}", userId, adminId);
                break;
        }
    }
}
