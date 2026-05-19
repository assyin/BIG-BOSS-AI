using BigBoss.Core.Entities;
using BigBoss.Core.Enums;
using BigBoss.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics;

namespace BigBoss.API.Controllers;

/// <summary>
/// Sprint 6.1 — Admin dashboard tech: monitoring système, modération, gestion users.
/// </summary>
[ApiController]
[Route("api/admin/tech")]
[Authorize(Roles = "Admin")]
public class AdminTechController : ControllerBase
{
    private readonly BigBossDbContext _db;
    private readonly ILogger<AdminTechController> _logger;

    public AdminTechController(BigBossDbContext db, ILogger<AdminTechController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Health système (CPU process, mémoire managed, uptime, DB connection check).
    /// </summary>
    [HttpGet("system-health")]
    public async Task<IActionResult> SystemHealth()
    {
        var process = Process.GetCurrentProcess();
        var uptimeSeconds = (DateTime.Now - process.StartTime).TotalSeconds;
        var managedMemMb = Math.Round(GC.GetTotalMemory(false) / 1024.0 / 1024.0, 2);
        var workingSetMb = Math.Round(process.WorkingSet64 / 1024.0 / 1024.0, 2);

        bool dbOk = false;
        long? dbLatencyMs = null;
        try
        {
            var sw = Stopwatch.StartNew();
            await _db.Database.ExecuteSqlRawAsync("SELECT 1");
            sw.Stop();
            dbOk = true;
            dbLatencyMs = sw.ElapsedMilliseconds;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "DB health check failed");
        }

        return Ok(new
        {
            uptime = TimeSpan.FromSeconds(uptimeSeconds).ToString(@"d\.hh\:mm\:ss"),
            uptimeSeconds = (int)uptimeSeconds,
            managedMemoryMb = managedMemMb,
            workingSetMb,
            threadCount = process.Threads.Count,
            db = new { ok = dbOk, latencyMs = dbLatencyMs },
            startedAt = process.StartTime,
        });
    }

    /// <summary>
    /// Liste les utilisateurs avec recherche + pagination.
    /// </summary>
    [HttpGet("users")]
    public async Task<IActionResult> ListUsers([FromQuery] string? q = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        pageSize = Math.Min(100, pageSize);
        var query = _db.Users.AsNoTracking().AsQueryable();

        if (!string.IsNullOrEmpty(q))
        {
            var pattern = $"%{q}%";
            query = query.Where(u =>
                EF.Functions.ILike(u.Email, pattern) ||
                EF.Functions.ILike(u.Name, pattern));
        }

        var total = await query.CountAsync();
        var rows = await query
            .OrderByDescending(u => u.LastActivityDate ?? u.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new
        {
            total,
            page,
            pageSize,
            users = rows.Select(u => new
            {
                u.Id,
                u.Email,
                u.Name,
                u.Role,
                u.SubscriptionTier,
                u.SubscriptionExpiresAt,
                u.IsSuspended,
                u.SuspendedReason,
                u.CurrentStreak,
                u.LastActivityDate,
                u.CreatedAt,
                u.PreferredLanguage,
                u.City,
            }),
        });
    }

    public record SuspendRequest(bool Suspend, string? Reason);

    /// <summary>Suspendre ou réactiver un user.</summary>
    [HttpPost("users/{userId:guid}/suspend")]
    public async Task<IActionResult> SuspendUser(Guid userId, [FromBody] SuspendRequest req)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return NotFound();

        user.IsSuspended = req.Suspend;
        user.SuspendedReason = req.Suspend ? req.Reason : null;
        await _db.SaveChangesAsync();

        _logger.LogWarning("Admin {action} user {UserId}: {Reason}",
            req.Suspend ? "SUSPENDED" : "REACTIVATED", userId, req.Reason);

        return Ok(new { suspended = user.IsSuspended });
    }

    /// <summary>
    /// Files de modération: posts + comments + live chat messages flagués.
    /// </summary>
    [HttpGet("moderation-queue")]
    public async Task<IActionResult> ModerationQueue([FromQuery] int limit = 50)
    {
        limit = Math.Min(200, limit);

        var flaggedPosts = await _db.Posts.AsNoTracking()
            .Where(p => p.IsFlagged && p.IsActive)
            .Include(p => p.User)
            .OrderByDescending(p => p.CreatedAt)
            .Take(limit)
            .ToListAsync();

        var flaggedComments = await _db.PostComments.AsNoTracking()
            .Where(c => c.IsFlagged)
            .Include(c => c.User)
            .OrderByDescending(c => c.CreatedAt)
            .Take(limit)
            .ToListAsync();

        var flaggedChatMsgs = await _db.LiveChatMessages.AsNoTracking()
            .Where(m => m.IsFlagged)
            .OrderByDescending(m => m.CreatedAt)
            .Take(limit)
            .ToListAsync();

        return Ok(new
        {
            posts = flaggedPosts.Select(p => new
            {
                p.Id,
                userId = p.UserId,
                userName = p.User?.Name ?? "?",
                p.Content,
                p.FlagReason,
                p.CreatedAt,
                kind = "post",
            }),
            comments = flaggedComments.Select(c => new
            {
                c.Id,
                postId = c.PostId,
                userId = c.UserId,
                userName = c.User?.Name ?? "?",
                c.Content,
                c.CreatedAt,
                kind = "comment",
            }),
            chatMessages = flaggedChatMsgs.Select(m => new
            {
                m.Id,
                liveId = m.LiveId,
                userId = m.UserId,
                userName = m.UserName,
                m.Content,
                m.ToxicityScore,
                m.IsHidden,
                m.CreatedAt,
                kind = "chat",
            }),
        });
    }

    /// <summary>Approuver un post flagué (retire le flag, le rendre visible).</summary>
    [HttpPost("posts/{postId:guid}/approve")]
    public async Task<IActionResult> ApprovePost(Guid postId)
    {
        var post = await _db.Posts.FirstOrDefaultAsync(p => p.Id == postId);
        if (post == null) return NotFound();
        post.IsFlagged = false;
        post.FlagReason = null;
        await _db.SaveChangesAsync();
        return Ok(new { approved = true });
    }

    /// <summary>Supprimer un post (soft delete via IsActive=false).</summary>
    [HttpDelete("posts/{postId:guid}")]
    public async Task<IActionResult> DeletePost(Guid postId)
    {
        var post = await _db.Posts.FirstOrDefaultAsync(p => p.Id == postId);
        if (post == null) return NotFound();
        post.IsActive = false;
        await _db.SaveChangesAsync();
        return Ok(new { deleted = true });
    }

    /// <summary>
    /// Coût IA estimé (Claude + ElevenLabs + Gemini) sur 30j.
    /// MVP: estimation basée sur le nombre de requêtes loggées dans CoachMessages.
    /// </summary>
    [HttpGet("ai-cost")]
    public async Task<IActionResult> AICost()
    {
        var now = DateTime.UtcNow;
        var monthAgo = now.AddDays(-30);
        var dayAgo = now.AddDays(-1);

        var claudeMsgs30d = await _db.CoachMessages.AsNoTracking()
            .CountAsync(m => m.CreatedAt >= monthAgo);
        var claudeMsgs24h = await _db.CoachMessages.AsNoTracking()
            .CountAsync(m => m.CreatedAt >= dayAgo);

        // Estimation: ~$0.001 par message Haiku, ~$0.01 par message Sonnet
        // Average mix → ~$0.003 par message
        var claudeCost30d = claudeMsgs30d * 0.003m;
        var claudeCost24h = claudeMsgs24h * 0.003m;

        return Ok(new
        {
            claude = new
            {
                messagesLast30d = claudeMsgs30d,
                messagesLast24h = claudeMsgs24h,
                estimatedCostUsdLast30d = Math.Round(claudeCost30d, 2),
                estimatedCostUsdLast24h = Math.Round(claudeCost24h, 2),
            },
            note = "Estimation basée sur le nombre de messages coach. Précision ±20%.",
        });
    }
}
