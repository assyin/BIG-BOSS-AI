using BigBoss.Core.DTOs.Lives;
using BigBoss.Core.Interfaces;
using BigBoss.Infrastructure.Data;
using BigBoss.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BigBoss.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LivesController : ControllerBase
{
    private readonly ILiveService _liveService;
    private readonly IPushNotificationService _pushService;
    private readonly ICloudflareStreamService _cfStream;
    private readonly BigBossDbContext _db;
    private readonly ILogger<LivesController> _logger;

    public LivesController(
        ILiveService liveService,
        IPushNotificationService pushService,
        ICloudflareStreamService cfStream,
        BigBossDbContext db,
        ILogger<LivesController> logger)
    {
        _liveService = liveService;
        _pushService = pushService;
        _cfStream = cfStream;
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Get all lives
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<LiveListDto>>> GetAll()
    {
        var lives = await _liveService.GetAllAsync();
        return Ok(lives);
    }

    /// <summary>
    /// Get upcoming lives
    /// </summary>
    [HttpGet("upcoming")]
    public async Task<ActionResult<IEnumerable<LiveListDto>>> GetUpcoming([FromQuery] int count = 10)
    {
        var lives = await _liveService.GetUpcomingAsync(count);
        return Ok(lives);
    }

    /// <summary>
    /// Get live by ID
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<LiveDto>> GetById(Guid id)
    {
        var live = await _liveService.GetByIdAsync(id);

        if (live == null)
            return NotFound(new { message = "Live non trouve" });

        return Ok(live);
    }

    /// <summary>
    /// Create a new live (Admin only)
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<LiveDto>> Create([FromBody] CreateLiveDto dto)
    {
        var live = await _liveService.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = live.Id }, live);
    }

    /// <summary>
    /// Update a live (Admin only)
    /// </summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<LiveDto>> Update(Guid id, [FromBody] UpdateLiveDto dto)
    {
        var live = await _liveService.UpdateAsync(id, dto);

        if (live == null)
            return NotFound(new { message = "Live non trouve" });

        return Ok(live);
    }

    /// <summary>
    /// Announce a live: broadcast push to all users (Admin only).
    /// Appeler typiquement 5-10 minutes avant le start.
    /// </summary>
    [HttpPost("{id:guid}/announce")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Announce(Guid id)
    {
        var live = await _liveService.GetByIdAsync(id);
        if (live == null)
            return NotFound(new { message = "Live non trouve" });

        var title = "🔴 LIVE qui commence !";
        var body = $"{live.Title} — rejoins ton coach maintenant";
        await _pushService.SendToAllAsync(title, body, new { liveId = id, type = "live_announce" });

        _logger.LogInformation("Live {LiveId} announced via push: {Title}", id, live.Title);
        return Ok(new { announced = true, liveId = id, title, body });
    }

    /// <summary>
    /// Delete a live (Admin only)
    /// </summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _liveService.DeleteAsync(id);

        if (!result)
            return NotFound(new { message = "Live non trouve" });

        return NoContent();
    }

    /// <summary>
    /// Sprint 5.3 — Démarre le live stream via Cloudflare Stream.
    /// Crée un live input CF (ou utilise l'existant si déjà créé), retourne le RTMP pour OBS
    /// et l'URL HLS pour les viewers. Admin only.
    /// </summary>
    [HttpPost("{id:guid}/start-stream")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> StartStream(Guid id)
    {
        var live = await _db.Lives.FirstOrDefaultAsync(l => l.Id == id);
        if (live == null) return NotFound(new { message = "Live non trouvé" });

        // Si déjà créé : ré-utiliser
        if (!string.IsNullOrEmpty(live.CloudflareInputUid))
        {
            var status = await _cfStream.GetLiveInputStatusAsync(live.CloudflareInputUid);
            return Ok(new
            {
                liveInputUid = live.CloudflareInputUid,
                rtmpKey = live.RtmpKey,                   // PRIVATE — admin only
                hlsUrl = live.StreamUrl,
                state = status.State,
                reused = true,
            });
        }

        var meta = $"BBF-Live-{id}";
        var input = await _cfStream.CreateLiveInputAsync(meta);

        live.CloudflareInputUid = input.LiveInputUid;
        live.RtmpKey = input.RtmpKey;
        live.StreamUrl = input.HlsUrl;
        live.StartedAt = DateTime.UtcNow;
        live.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        _logger.LogInformation("Live stream started for {LiveId}, mock={Mock}", id, input.IsMock);

        return Ok(new
        {
            liveInputUid = input.LiveInputUid,
            rtmpUrl = input.RtmpUrl,
            rtmpKey = input.RtmpKey,
            hlsUrl = input.HlsUrl,
            dashUrl = input.DashUrl,
            playbackId = input.PlaybackId,
            isMock = input.IsMock,
        });
    }

    /// <summary>
    /// Sprint 5.3 — Termine le live. Met EndedAt. Le replay sera disponible
    /// quelques minutes après via webhook Cloudflare.
    /// </summary>
    [HttpPost("{id:guid}/stop-stream")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> StopStream(Guid id)
    {
        var live = await _db.Lives.FirstOrDefaultAsync(l => l.Id == id);
        if (live == null) return NotFound(new { message = "Live non trouvé" });

        live.EndedAt = DateTime.UtcNow;
        live.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        _logger.LogInformation("Live stream stopped for {LiveId}", id);
        return Ok(new { stopped = true, endedAt = live.EndedAt });
    }

    /// <summary>
    /// Sprint 5.3 — État du live input Cloudflare (state, viewers en cours).
    /// </summary>
    [HttpGet("{id:guid}/stream-status")]
    public async Task<IActionResult> StreamStatus(Guid id)
    {
        var live = await _db.Lives.AsNoTracking().FirstOrDefaultAsync(l => l.Id == id);
        if (live == null) return NotFound();
        if (string.IsNullOrEmpty(live.CloudflareInputUid))
            return Ok(new { state = "not-started", liveInputUid = (string?)null });

        var status = await _cfStream.GetLiveInputStatusAsync(live.CloudflareInputUid);
        return Ok(new { status.State, liveInputUid = status.LiveInputUid, status.CurrentViewers });
    }

    /// <summary>
    /// Sprint 5.3 — Webhook Cloudflare Stream.
    /// Reçu quand une vidéo (replay) est prête après la fin du live.
    /// Payload typique:
    /// {
    ///   "uid": "video-uid-xxx",
    ///   "meta": { "name": "BBF-Live-<liveId>" },
    ///   "readyToStream": true,
    ///   "status": { "state": "ready" },
    ///   "playback": { "hls": "https://customer.cloudflarestream.com/{uid}/manifest/video.m3u8" }
    /// }
    ///
    /// Auth: header "Authorization: Bearer <BBF_CF_WEBHOOK_SECRET>" (configuré côté CF Stream).
    /// Pas d'auth utilisateur (CF ne sait pas envoyer un JWT BBF).
    /// </summary>
    [HttpPost("webhook/cloudflare")]
    [AllowAnonymous]
    public async Task<IActionResult> CloudflareWebhook(
        [FromBody] System.Text.Json.JsonElement payload,
        [FromServices] Microsoft.Extensions.Configuration.IConfiguration config)
    {
        // Auth simple: vérifier shared secret dans Authorization header
        var expectedSecret = config["BBF_CF_WEBHOOK_SECRET"];
        if (!string.IsNullOrEmpty(expectedSecret))
        {
            var authHeader = Request.Headers["Authorization"].ToString();
            if (!authHeader.Equals($"Bearer {expectedSecret}", StringComparison.Ordinal))
            {
                _logger.LogWarning("CF webhook: invalid auth header");
                return Unauthorized();
            }
        }

        try
        {
            // Extraire meta.name = "BBF-Live-<liveId>"
            if (!payload.TryGetProperty("meta", out var meta)
                || !meta.TryGetProperty("name", out var nameElement))
            {
                _logger.LogWarning("CF webhook: meta.name missing");
                return BadRequest(new { error = "meta.name required" });
            }

            var name = nameElement.GetString() ?? "";
            if (!name.StartsWith("BBF-Live-"))
            {
                _logger.LogInformation("CF webhook: ignoring non-BBF event for {Name}", name);
                return Ok(new { ignored = true });
            }

            var liveIdStr = name["BBF-Live-".Length..];
            if (!Guid.TryParse(liveIdStr, out var liveId))
                return BadRequest(new { error = "invalid liveId in meta.name" });

            // Vérifier ready
            bool ready = false;
            if (payload.TryGetProperty("readyToStream", out var rts) && rts.ValueKind == System.Text.Json.JsonValueKind.True)
                ready = true;
            if (payload.TryGetProperty("status", out var status)
                && status.TryGetProperty("state", out var stateElement)
                && stateElement.GetString() == "ready")
                ready = true;

            if (!ready)
            {
                _logger.LogInformation("CF webhook: video {Name} not ready yet", name);
                return Ok(new { received = true, ready = false });
            }

            // Extraire URL playback HLS
            string? replayHls = null;
            if (payload.TryGetProperty("playback", out var playback)
                && playback.TryGetProperty("hls", out var hls))
            {
                replayHls = hls.GetString();
            }

            // Fallback: construire depuis video uid si pas de playback explicite
            if (string.IsNullOrEmpty(replayHls)
                && payload.TryGetProperty("uid", out var uidElement))
            {
                var videoUid = uidElement.GetString();
                var subdomain = config["BBF_CF_STREAM_CUSTOMER_SUBDOMAIN"] ?? "customer-bbf";
                replayHls = $"https://{subdomain}.cloudflarestream.com/{videoUid}/manifest/video.m3u8";
            }

            if (string.IsNullOrEmpty(replayHls))
            {
                _logger.LogWarning("CF webhook: no playback HLS for {Name}", name);
                return Ok(new { received = true, replayUrl = (string?)null });
            }

            // Update DB
            var live = await _db.Lives.FirstOrDefaultAsync(l => l.Id == liveId);
            if (live == null)
            {
                _logger.LogWarning("CF webhook: live {LiveId} not found in DB", liveId);
                return NotFound();
            }

            live.ReplayUrl = replayHls;
            live.UpdatedAt = DateTime.UtcNow;
            // Si EndedAt pas encore set, on assume que le live est fini
            if (!live.EndedAt.HasValue) live.EndedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            _logger.LogInformation("CF webhook: replay ready for live {LiveId}: {Url}", liveId, replayHls);
            return Ok(new { received = true, liveId, replayUrl = replayHls });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "CF webhook processing failed");
            return StatusCode(500, new { error = "webhook processing failed" });
        }
    }
}
