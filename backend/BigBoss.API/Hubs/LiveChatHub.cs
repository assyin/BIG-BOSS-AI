using System.Security.Claims;
using BigBoss.Core.Entities;
using BigBoss.Core.Interfaces;
using BigBoss.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace BigBoss.API.Hubs;

/// <summary>
/// Sprint 5.3 — Chat live temps réel via SignalR.
///
/// Groups : un group par live (key = "live:{liveId}").
/// Client appelle JoinLive(liveId) → rejoint le group → reçoit "MessageReceived" pour chaque nouveau msg.
/// Client appelle SendMessage(liveId, content) → modération Claude inline → broadcast au group si OK.
///
/// Doc côté client mobile: @microsoft/signalr HubConnection.
/// </summary>
[Authorize]
public class LiveChatHub : Hub
{
    private readonly BigBossDbContext _db;
    private readonly IClaudeService _claude;
    private readonly ILogger<LiveChatHub> _logger;

    public LiveChatHub(BigBossDbContext db, IClaudeService claude, ILogger<LiveChatHub> logger)
    {
        _db = db;
        _claude = claude;
        _logger = logger;
    }

    private Guid GetUserId()
    {
        var claim = Context.User?.FindFirst(ClaimTypes.NameIdentifier);
        if (claim == null || !Guid.TryParse(claim.Value, out var id))
            throw new HubException("Unauthorized");
        return id;
    }

    private static string GroupKey(Guid liveId) => $"live:{liveId}";

    public override async Task OnConnectedAsync()
    {
        await base.OnConnectedAsync();
        _logger.LogDebug("LiveChat connected: {ConnId}", Context.ConnectionId);
    }

    /// <summary>Rejoint le group du live pour recevoir les nouveaux messages.</summary>
    public async Task<object> JoinLive(Guid liveId)
    {
        var live = await _db.Lives.AsNoTracking().FirstOrDefaultAsync(l => l.Id == liveId);
        if (live == null) throw new HubException("Live introuvable");

        await Groups.AddToGroupAsync(Context.ConnectionId, GroupKey(liveId));

        // Renvoie les 30 derniers messages comme historique
        var recent = await _db.LiveChatMessages
            .AsNoTracking()
            .Where(m => m.LiveId == liveId && !m.IsHidden)
            .OrderByDescending(m => m.CreatedAt)
            .Take(30)
            .ToListAsync();
        recent.Reverse();

        _logger.LogInformation("User joined live chat: liveId={LiveId} conn={ConnId}",
            liveId, Context.ConnectionId);

        return new
        {
            joined = true,
            history = recent.Select(m => new
            {
                m.Id,
                m.UserId,
                m.UserName,
                m.Content,
                m.CreatedAt,
            }).ToList(),
        };
    }

    public async Task LeaveLive(Guid liveId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, GroupKey(liveId));
    }

    /// <summary>
    /// Envoie un message dans le chat live. Modération Claude inline avant broadcast.
    /// Si toxic → IsHidden=true, l'auteur reçoit un "moderated" en silence (pas de broadcast).
    /// </summary>
    public async Task SendMessage(Guid liveId, string content)
    {
        if (string.IsNullOrWhiteSpace(content)) return;
        if (content.Length > 500) content = content[..500];

        var userId = GetUserId();
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) throw new HubException("User introuvable");

        // Modération Claude (fail-open : si Claude indispo, on envoie quand même)
        var moderation = await _claude.ScoreToxicityAsync(content);

        var msg = new LiveChatMessage
        {
            Id = Guid.NewGuid(),
            LiveId = liveId,
            UserId = userId,
            UserName = user.Name,
            Content = content,
            IsFlagged = moderation.ShouldFlag,
            IsHidden = moderation.ShouldFlag && moderation.ToxicityScore > 0.85m,  // auto-mute si très toxique
            ToxicityScore = moderation.ToxicityScore,
            FlagReason = moderation.ShouldFlag ? moderation.Reason : null,
            CreatedAt = DateTime.UtcNow,
        };
        _db.LiveChatMessages.Add(msg);
        await _db.SaveChangesAsync();

        if (msg.IsHidden)
        {
            // Auto-mute : l'auteur reçoit feedback discret, le group ne voit rien
            await Clients.Caller.SendAsync("Moderated", new
            {
                reason = "Ton message a été masqué (modération auto)",
                category = moderation.Category,
            });
            _logger.LogWarning("LiveChat msg auto-hidden: live={LiveId} user={UserId} score={Score}",
                liveId, userId, moderation.ToxicityScore);
            return;
        }

        // Broadcast au group
        await Clients.Group(GroupKey(liveId)).SendAsync("MessageReceived", new
        {
            msg.Id,
            msg.UserId,
            msg.UserName,
            msg.Content,
            msg.CreatedAt,
            isFlagged = msg.IsFlagged, // visible mais flagué pour les modérateurs
        });
    }

    /// <summary>Like temps réel : broadcast un "LikeReceived" au group, increment compteur en DB.</summary>
    public async Task SendLike(Guid liveId)
    {
        var live = await _db.Lives.FirstOrDefaultAsync(l => l.Id == liveId);
        if (live == null) return;

        live.TotalLikes++;
        await _db.SaveChangesAsync();

        await Clients.Group(GroupKey(liveId)).SendAsync("LikeReceived", new
        {
            liveId,
            totalLikes = live.TotalLikes,
            at = DateTime.UtcNow,
        });
    }
}
