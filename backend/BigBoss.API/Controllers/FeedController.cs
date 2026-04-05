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

    public FeedController(IFeedService feedService, IPointsService pointsService, IGamificationConfigService config)
    {
        _feedService = feedService;
        _pointsService = pointsService;
        _config = config;
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
