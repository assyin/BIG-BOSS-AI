using BigBoss.Core.Entities;
using BigBoss.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BigBoss.Infrastructure.Services;

/// <summary>
/// Sprint 5.2 — Service Gym Buddies (matching + connexions).
/// </summary>
public interface IBuddyService
{
    Task<BuddyProfile?> GetMyProfileAsync(Guid userId);
    Task<BuddyProfile> UpsertProfileAsync(Guid userId, UpsertBuddyProfileDto dto);
    Task<List<BuddyRecommendationDto>> GetRecommendedAsync(Guid userId, int count = 20);
    Task<BuddyConnection> RequestConnectionAsync(Guid requesterId, Guid addresseeId, string? message);
    Task<BuddyConnection?> RespondToConnectionAsync(Guid userId, Guid connectionId, bool accept);
    Task<List<BuddyConnectionDto>> GetMyConnectionsAsync(Guid userId);
    Task<List<BuddyConnectionDto>> GetPendingRequestsAsync(Guid userId);
}

public record UpsertBuddyProfileDto(
    string Bio,
    string City,
    string? GymName,
    List<string> Goals,
    List<string> AvailableSlots,
    string? PreferredLanguage,
    bool Visible
);

public record BuddyRecommendationDto(
    Guid UserId,
    string Name,
    string? AvatarUrl,
    string Bio,
    string City,
    string? GymName,
    List<string> Goals,
    List<string> AvailableSlots,
    int MatchScore,                   // 0-100
    List<string> MatchReasons,        // ex: ["même ville", "même objectif", "même créneau"]
    string? Level,                    // niveau fitness
    bool IsConnected,
    bool RequestPending
);

public record BuddyConnectionDto(
    Guid ConnectionId,
    Guid OtherUserId,
    string OtherUserName,
    string? OtherAvatarUrl,
    string? OtherCity,
    BuddyConnectionStatus Status,
    bool IsIncoming,                  // true si user est l'addressee
    string? Message,
    DateTime CreatedAt
);

public class BuddyService : IBuddyService
{
    private readonly BigBossDbContext _db;
    private readonly ILogger<BuddyService> _logger;

    public BuddyService(BigBossDbContext db, ILogger<BuddyService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<BuddyProfile?> GetMyProfileAsync(Guid userId)
    {
        return await _db.BuddyProfiles.AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == userId);
    }

    public async Task<BuddyProfile> UpsertProfileAsync(Guid userId, UpsertBuddyProfileDto dto)
    {
        var profile = await _db.BuddyProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        if (profile == null)
        {
            profile = new BuddyProfile
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                CreatedAt = DateTime.UtcNow,
            };
            _db.BuddyProfiles.Add(profile);
        }

        profile.Bio = dto.Bio ?? "";
        profile.City = dto.City ?? "";
        profile.GymName = dto.GymName;
        profile.Goals = dto.Goals ?? new();
        profile.AvailableSlots = dto.AvailableSlots ?? new();
        profile.PreferredLanguage = dto.PreferredLanguage;
        profile.Visible = dto.Visible;
        profile.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return profile;
    }

    /// <summary>
    /// Algo matching simple : score basé sur 4 critères pondérés.
    /// </summary>
    public async Task<List<BuddyRecommendationDto>> GetRecommendedAsync(Guid userId, int count = 20)
    {
        var me = await _db.BuddyProfiles.AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == userId);

        var myUser = await _db.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId);
        if (myUser == null) return new();

        // Exclure les users déjà connectés OU en demande pending
        var connectedIds = await _db.BuddyConnections.AsNoTracking()
            .Where(c => (c.RequesterId == userId || c.AddresseeId == userId)
                && c.Status != BuddyConnectionStatus.Declined)
            .Select(c => c.RequesterId == userId ? c.AddresseeId : c.RequesterId)
            .ToListAsync();

        var pendingFromMeIds = await _db.BuddyConnections.AsNoTracking()
            .Where(c => c.RequesterId == userId && c.Status == BuddyConnectionStatus.Pending)
            .Select(c => c.AddresseeId)
            .ToListAsync();

        // Candidats : tous les autres profiles visibles
        var candidates = await _db.BuddyProfiles.AsNoTracking()
            .Where(p => p.UserId != userId && p.Visible)
            .Include(p => p.User)
            .ToListAsync();

        var scored = new List<BuddyRecommendationDto>();
        foreach (var c in candidates)
        {
            var reasons = new List<string>();
            int score = 0;

            // 1. Même ville (poids fort: 40 points)
            if (me != null && !string.IsNullOrEmpty(me.City)
                && string.Equals(c.City, me.City, StringComparison.OrdinalIgnoreCase))
            {
                score += 40;
                reasons.Add($"Même ville ({c.City})");
            }

            // 2. Même salle (poids très fort: +20 si même ville déjà)
            if (me != null && !string.IsNullOrEmpty(me.GymName)
                && string.Equals(c.GymName, me.GymName, StringComparison.OrdinalIgnoreCase))
            {
                score += 20;
                reasons.Add($"Même salle ({c.GymName})");
            }

            // 3. Objectifs communs (poids: 5 par overlap)
            if (me != null && me.Goals.Any() && c.Goals.Any())
            {
                var commonGoals = me.Goals.Intersect(c.Goals).ToList();
                if (commonGoals.Any())
                {
                    score += 5 * commonGoals.Count;
                    reasons.Add($"Objectifs communs : {string.Join(", ", commonGoals)}");
                }
            }

            // 4. Créneaux communs (poids: 10 par overlap)
            if (me != null && me.AvailableSlots.Any() && c.AvailableSlots.Any())
            {
                var commonSlots = me.AvailableSlots.Intersect(c.AvailableSlots).ToList();
                if (commonSlots.Any())
                {
                    score += 10 * commonSlots.Count;
                    reasons.Add($"Créneaux compatibles ({commonSlots.Count})");
                }
            }

            // 5. Même niveau (User.Level enum) — bonus 10
            if (myUser.Level == c.User.Level)
            {
                score += 10;
                reasons.Add($"Niveau {c.User.Level}");
            }

            // 6. Bonus si nouveau profile (créé < 30j) — booste les nouveaux
            if (c.CreatedAt > DateTime.UtcNow.AddDays(-30))
            {
                score += 5;
            }

            // Cap à 100
            score = Math.Min(100, score);

            scored.Add(new BuddyRecommendationDto(
                UserId: c.UserId,
                Name: c.User.Name,
                AvatarUrl: c.User.AvatarUrl,
                Bio: c.Bio,
                City: c.City,
                GymName: c.GymName,
                Goals: c.Goals,
                AvailableSlots: c.AvailableSlots,
                MatchScore: score,
                MatchReasons: reasons,
                Level: c.User.Level.ToString(),
                IsConnected: connectedIds.Contains(c.UserId) && !pendingFromMeIds.Contains(c.UserId),
                RequestPending: pendingFromMeIds.Contains(c.UserId)
            ));
        }

        return scored
            .OrderByDescending(s => s.MatchScore)
            .ThenByDescending(s => s.UserId)
            .Take(count)
            .ToList();
    }

    public async Task<BuddyConnection> RequestConnectionAsync(Guid requesterId, Guid addresseeId, string? message)
    {
        if (requesterId == addresseeId)
            throw new InvalidOperationException("Cannot connect to yourself");

        var existing = await _db.BuddyConnections
            .FirstOrDefaultAsync(c => c.RequesterId == requesterId && c.AddresseeId == addresseeId);
        if (existing != null)
        {
            return existing; // déjà existe (pending/accepted/declined)
        }

        // Check si l'autre user a déjà envoyé une demande → auto-accept
        var reverse = await _db.BuddyConnections
            .FirstOrDefaultAsync(c => c.RequesterId == addresseeId && c.AddresseeId == requesterId
                && c.Status == BuddyConnectionStatus.Pending);
        if (reverse != null)
        {
            reverse.Status = BuddyConnectionStatus.Accepted;
            reverse.RespondedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            _logger.LogInformation("Mutual buddy match auto-accepted: {U1} <-> {U2}", requesterId, addresseeId);
            return reverse;
        }

        var conn = new BuddyConnection
        {
            Id = Guid.NewGuid(),
            RequesterId = requesterId,
            AddresseeId = addresseeId,
            Status = BuddyConnectionStatus.Pending,
            Message = message,
            CreatedAt = DateTime.UtcNow,
        };
        _db.BuddyConnections.Add(conn);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Buddy request: {From} -> {To}", requesterId, addresseeId);
        return conn;
    }

    public async Task<BuddyConnection?> RespondToConnectionAsync(Guid userId, Guid connectionId, bool accept)
    {
        var conn = await _db.BuddyConnections.FirstOrDefaultAsync(c => c.Id == connectionId);
        if (conn == null) return null;
        if (conn.AddresseeId != userId) return null; // only addressee can respond

        conn.Status = accept ? BuddyConnectionStatus.Accepted : BuddyConnectionStatus.Declined;
        conn.RespondedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        _logger.LogInformation("Buddy connection {ConnId} {Status}", connectionId, conn.Status);
        return conn;
    }

    public async Task<List<BuddyConnectionDto>> GetMyConnectionsAsync(Guid userId)
    {
        var rows = await _db.BuddyConnections.AsNoTracking()
            .Where(c => (c.RequesterId == userId || c.AddresseeId == userId)
                && c.Status == BuddyConnectionStatus.Accepted)
            .Include(c => c.Requester)
            .Include(c => c.Addressee)
            .OrderByDescending(c => c.RespondedAt ?? c.CreatedAt)
            .ToListAsync();

        return rows.Select(c => new BuddyConnectionDto(
            c.Id,
            c.RequesterId == userId ? c.AddresseeId : c.RequesterId,
            c.RequesterId == userId ? c.Addressee.Name : c.Requester.Name,
            c.RequesterId == userId ? c.Addressee.AvatarUrl : c.Requester.AvatarUrl,
            c.RequesterId == userId ? c.Addressee.City : c.Requester.City,
            c.Status,
            c.AddresseeId == userId,
            c.Message,
            c.CreatedAt
        )).ToList();
    }

    public async Task<List<BuddyConnectionDto>> GetPendingRequestsAsync(Guid userId)
    {
        var rows = await _db.BuddyConnections.AsNoTracking()
            .Where(c => c.AddresseeId == userId && c.Status == BuddyConnectionStatus.Pending)
            .Include(c => c.Requester)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        return rows.Select(c => new BuddyConnectionDto(
            c.Id,
            c.RequesterId,
            c.Requester.Name,
            c.Requester.AvatarUrl,
            c.Requester.City,
            c.Status,
            true,
            c.Message,
            c.CreatedAt
        )).ToList();
    }
}
