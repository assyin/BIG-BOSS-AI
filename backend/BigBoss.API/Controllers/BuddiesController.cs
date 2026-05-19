using System.Security.Claims;
using BigBoss.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BigBoss.API.Controllers;

/// <summary>
/// Sprint 5.2 — Gym Buddies matching endpoints.
/// </summary>
[ApiController]
[Route("api/buddies")]
[Authorize]
public class BuddiesController : ControllerBase
{
    private readonly IBuddyService _buddyService;
    private readonly IPushNotificationService _push;
    private readonly ILogger<BuddiesController> _logger;

    public BuddiesController(IBuddyService buddyService, IPushNotificationService push, ILogger<BuddiesController> logger)
    {
        _buddyService = buddyService;
        _push = push;
        _logger = logger;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet("me")]
    public async Task<IActionResult> GetMyProfile()
    {
        var profile = await _buddyService.GetMyProfileAsync(GetUserId());
        if (profile == null) return Ok(new { hasProfile = false });
        return Ok(new
        {
            hasProfile = true,
            profile.Bio,
            profile.City,
            profile.GymName,
            profile.Goals,
            profile.AvailableSlots,
            profile.PreferredLanguage,
            profile.Visible,
        });
    }

    [HttpPut("me")]
    public async Task<IActionResult> UpsertMyProfile([FromBody] UpsertBuddyProfileDto dto)
    {
        var profile = await _buddyService.UpsertProfileAsync(GetUserId(), dto);
        return Ok(new { saved = true, profile.Id });
    }

    /// <summary>
    /// Liste des matches recommandés triés par score décroissant.
    /// </summary>
    [HttpGet("recommended")]
    public async Task<IActionResult> GetRecommended([FromQuery] int count = 20)
    {
        var matches = await _buddyService.GetRecommendedAsync(GetUserId(), Math.Min(50, count));
        return Ok(matches);
    }

    public record ConnectRequest(string? Message);

    /// <summary>Envoie une demande de connexion à un autre user.</summary>
    [HttpPost("connect/{userId:guid}")]
    public async Task<IActionResult> Connect(Guid userId, [FromBody] ConnectRequest? req = null)
    {
        var meId = GetUserId();
        try
        {
            var conn = await _buddyService.RequestConnectionAsync(meId, userId, req?.Message);
            // Notif push à l'addressee (silent fail si pas de token)
            try
            {
                await _push.SendToUserAsync(userId, "Nouvelle demande Buddy 💪",
                    "Un athlète veut se connecter avec toi !", new { type = "buddy_request", connectionId = conn.Id });
            }
            catch { /* ignore */ }

            return Ok(new
            {
                connectionId = conn.Id,
                status = conn.Status.ToString(),
                autoAccepted = conn.Status == BigBoss.Core.Entities.BuddyConnectionStatus.Accepted,
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>Accepte ou refuse une demande reçue.</summary>
    [HttpPost("connections/{connectionId:guid}/respond")]
    public async Task<IActionResult> Respond(Guid connectionId, [FromQuery] bool accept)
    {
        var conn = await _buddyService.RespondToConnectionAsync(GetUserId(), connectionId, accept);
        if (conn == null) return NotFound(new { error = "Connection not found" });

        if (accept)
        {
            try
            {
                await _push.SendToUserAsync(conn.RequesterId, "Buddy accepté 🤝",
                    "Tu as un nouveau partenaire d'entraînement !", new { type = "buddy_accepted" });
            }
            catch { /* ignore */ }
        }

        return Ok(new { status = conn.Status.ToString() });
    }

    /// <summary>Liste des connexions acceptées (mes buddies actifs).</summary>
    [HttpGet("my")]
    public async Task<IActionResult> GetMyConnections()
    {
        var list = await _buddyService.GetMyConnectionsAsync(GetUserId());
        return Ok(list);
    }

    /// <summary>Demandes reçues en attente de réponse.</summary>
    [HttpGet("pending")]
    public async Task<IActionResult> GetPending()
    {
        var list = await _buddyService.GetPendingRequestsAsync(GetUserId());
        return Ok(list);
    }
}
