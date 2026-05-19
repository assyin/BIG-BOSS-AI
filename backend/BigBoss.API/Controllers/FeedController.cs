using BigBoss.Core.Entities;
using BigBoss.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BigBoss.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FeedController : ControllerBase
{
    private readonly IFeedService _feedService;
    private readonly IPointsService _pointsService;
    private readonly IGamificationConfigService _config;
    private readonly ICloudflareService _r2;
    private readonly ILogger<FeedController> _logger;

    public FeedController(
        IFeedService feedService,
        IPointsService pointsService,
        IGamificationConfigService config,
        ICloudflareService r2,
        ILogger<FeedController> logger)
    {
        _feedService = feedService;
        _pointsService = pointsService;
        _config = config;
        _r2 = r2;
        _logger = logger;
    }

    /// <summary>
    /// Sprint 5.1 — Upload image pour un post de feed.
    /// Body: { "photoBase64": "..." } — image en base64 (sans préfixe data:image/...).
    /// Retour: { "imageUrl": "https://pub-...r2.dev/feed/{userId}/{timestamp}.jpg" }
    /// </summary>
    public record UploadImageRequest(string PhotoBase64);

    [HttpPost("upload-image")]
    public async Task<IActionResult> UploadImage([FromBody] UploadImageRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.PhotoBase64))
            return BadRequest(new { error = "photoBase64 required" });

        var userId = GetUserId();
        var base64 = req.PhotoBase64;
        var commaIdx = base64.IndexOf(',');
        if (base64.StartsWith("data:") && commaIdx > 0) base64 = base64[(commaIdx + 1)..];

        byte[] bytes;
        try { bytes = Convert.FromBase64String(base64); }
        catch { return BadRequest(new { error = "invalid base64" }); }

        // Limit 5 MB pour les photos feed (compressées côté mobile à quality=0.6 normalement)
        if (bytes.Length > 5 * 1024 * 1024)
            return BadRequest(new { error = "image too large (max 5 MB)" });

        var key = $"feed/{userId}/{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid():N}.jpg";
        try
        {
            using var stream = new MemoryStream(bytes);
            await _r2.UploadFileAsync(stream, key, "image/jpeg");
            var publicUrl = _r2.GetPublicUrl(key);
            _logger.LogInformation("Feed image uploaded: {Key} ({Bytes} bytes) for user {UserId}",
                key, bytes.Length, userId);
            return Ok(new { imageUrl = publicUrl, objectKey = key });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Feed image upload failed");
            return StatusCode(502, new { error = "upload R2 failed" });
        }
    }

    [HttpGet]
    public async Task<IActionResult> GetFeed([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var feed = await _feedService.GetFeedAsync(page, pageSize);
        return Ok(feed);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetPost(Guid id)
    {
        var post = await _feedService.GetPostAsync(id);
        if (post == null) return NotFound();
        return Ok(post);
    }

    [HttpPost]
    public async Task<IActionResult> CreatePost([FromBody] CreatePostRequest request)
    {
        var userId = GetUserId();
        var post = await _feedService.CreatePostAsync(userId, request);

        // Award points for sharing
        var sharePoints = await _config.GetIntAsync("points.feed_shared", 5);
        if (sharePoints > 0)
        {
            await _pointsService.AwardPointsAsync(new PointAwardRequest
            {
                UserId = userId,
                Amount = sharePoints,
                Type = PointTransactionType.FeedShared,
                Reason = "Partage sur le feed",
                IdempotencyKey = $"feed_share:{userId}:{DateTime.UtcNow:yyyyMMdd}",
            });
        }

        return Ok(post);
    }

    [HttpPost("{id}/react")]
    public async Task<IActionResult> React(Guid id, [FromBody] ReactRequest request)
    {
        var userId = GetUserId();
        var result = await _feedService.ReactAsync(userId, id, request.Type);
        return Ok(new { reacted = result });
    }

    [HttpPost("{id}/comment")]
    public async Task<IActionResult> Comment(Guid id, [FromBody] CommentRequest request)
    {
        var userId = GetUserId();
        var comment = await _feedService.CommentAsync(userId, id, request.Content);
        return Ok(comment);
    }

    [HttpGet("{id}/comments")]
    public async Task<IActionResult> GetComments(Guid id, [FromQuery] int page = 1)
    {
        var comments = await _feedService.GetCommentsAsync(id, page);
        return Ok(comments.Select(c => new
        {
            c.Id,
            c.UserId,
            userName = c.User?.Name ?? "Utilisateur",
            c.Content,
            c.CreatedAt,
        }));
    }

    [HttpPost("{id}/flag")]
    public async Task<IActionResult> FlagPost(Guid id, [FromBody] FlagRequest request)
    {
        await _feedService.FlagPostAsync(id, request.Reason);
        return Ok(new { message = "Contenu signale" });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePost(Guid id)
    {
        var userId = GetUserId();
        var ok = await _feedService.DeletePostAsync(id, userId);
        if (!ok) return NotFound();
        return Ok(new { message = "Post supprime" });
    }

    private Guid GetUserId()
    {
        var claim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (claim == null || !Guid.TryParse(claim.Value, out var id)) throw new UnauthorizedAccessException();
        return id;
    }
}

public class ReactRequest { public ReactionType Type { get; set; } }
public class CommentRequest { public string Content { get; set; } = string.Empty; }
public class FlagRequest { public string Reason { get; set; } = string.Empty; }
