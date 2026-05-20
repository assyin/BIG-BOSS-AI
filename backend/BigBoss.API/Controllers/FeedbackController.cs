using System.Security.Claims;
using BigBoss.Core.Entities;
using BigBoss.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BigBoss.API.Controllers;

/// <summary>
/// Sprint 6.5 — Feedback in-app utilisateur + admin gestion.
/// </summary>
[ApiController]
[Route("api/feedback")]
public class FeedbackController : ControllerBase
{
    private readonly BigBossDbContext _db;
    private readonly ILogger<FeedbackController> _logger;

    public FeedbackController(BigBossDbContext db, ILogger<FeedbackController> logger)
    {
        _db = db;
        _logger = logger;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    public record SubmitFeedbackRequest(
        int Rating,
        string Category,
        string Content,
        string? ScreenshotBase64,
        string? AppVersion,
        string? DeviceInfo
    );

    /// <summary>
    /// Soumettre un feedback (auth required).
    /// </summary>
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Submit([FromBody] SubmitFeedbackRequest req)
    {
        if (req.Rating < 1 || req.Rating > 5)
            return BadRequest(new { error = "Rating doit être entre 1 et 5" });
        if (string.IsNullOrWhiteSpace(req.Content))
            return BadRequest(new { error = "Content requis" });

        var validCategories = new[] { "bug", "feature", "general", "praise" };
        var category = validCategories.Contains(req.Category?.ToLower() ?? "")
            ? req.Category!.ToLower()
            : "general";

        var fb = new UserFeedback
        {
            Id = Guid.NewGuid(),
            UserId = GetUserId(),
            Rating = req.Rating,
            Category = category,
            Content = req.Content.Trim(),
            AppVersion = req.AppVersion,
            DeviceInfo = req.DeviceInfo,
            Status = "Open",
            CreatedAt = DateTime.UtcNow,
        };

        // ScreenshotBase64 → R2 upload pourrait être ajouté ici (skip pour MVP)
        // fb.ScreenshotUrl = await _r2.UploadAsync(...);

        _db.UserFeedbacks.Add(fb);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Feedback received: rating={Rating} category={Cat} user={UserId}",
            fb.Rating, fb.Category, fb.UserId);

        return Ok(new { received = true, id = fb.Id });
    }

    [HttpGet("my")]
    [Authorize]
    public async Task<IActionResult> GetMy()
    {
        var userId = GetUserId();
        var rows = await _db.UserFeedbacks.AsNoTracking()
            .Where(f => f.UserId == userId)
            .OrderByDescending(f => f.CreatedAt)
            .Select(f => new
            {
                f.Id,
                f.Rating,
                f.Category,
                f.Content,
                f.Status,
                f.AdminResponse,
                f.CreatedAt,
                f.RespondedAt,
            })
            .ToListAsync();
        return Ok(rows);
    }

    // ─── Admin endpoints ────────────────────────────────────────

    [HttpGet("admin/list")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> List(
        [FromQuery] string? status = null,
        [FromQuery] string? category = null,
        [FromQuery] int? minRating = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        pageSize = Math.Min(200, pageSize);
        var query = _db.UserFeedbacks.AsNoTracking().Include(f => f.User).AsQueryable();
        if (!string.IsNullOrEmpty(status)) query = query.Where(f => f.Status == status);
        if (!string.IsNullOrEmpty(category)) query = query.Where(f => f.Category == category);
        if (minRating.HasValue) query = query.Where(f => f.Rating >= minRating);

        var total = await query.CountAsync();
        var rows = await query
            .OrderByDescending(f => f.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var avg = total > 0 ? await query.AverageAsync(f => (double)f.Rating) : 0;

        return Ok(new
        {
            total,
            page,
            pageSize,
            averageRating = Math.Round(avg, 2),
            feedbacks = rows.Select(f => new
            {
                f.Id,
                f.UserId,
                userName = f.User?.Name ?? "anonyme",
                userEmail = f.User?.Email,
                f.Rating,
                f.Category,
                f.Content,
                f.ScreenshotUrl,
                f.AppVersion,
                f.DeviceInfo,
                f.Status,
                f.AdminResponse,
                f.CreatedAt,
                f.RespondedAt,
            }),
        });
    }

    public record AdminResponseRequest(string Response, string? NewStatus);

    [HttpPost("admin/{id:guid}/respond")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Respond(Guid id, [FromBody] AdminResponseRequest req)
    {
        var fb = await _db.UserFeedbacks.FirstOrDefaultAsync(f => f.Id == id);
        if (fb == null) return NotFound();

        fb.AdminResponse = req.Response;
        fb.RespondedAt = DateTime.UtcNow;
        if (!string.IsNullOrEmpty(req.NewStatus)) fb.Status = req.NewStatus;
        await _db.SaveChangesAsync();
        return Ok(new { updated = true });
    }

    [HttpGet("admin/stats")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Stats()
    {
        var byStatus = await _db.UserFeedbacks.AsNoTracking()
            .GroupBy(f => f.Status)
            .Select(g => new { status = g.Key, count = g.Count() })
            .ToListAsync();
        var byCategory = await _db.UserFeedbacks.AsNoTracking()
            .GroupBy(f => f.Category)
            .Select(g => new { category = g.Key, count = g.Count() })
            .ToListAsync();
        var total = await _db.UserFeedbacks.AsNoTracking().CountAsync();
        var avg = total > 0 ? await _db.UserFeedbacks.AsNoTracking().AverageAsync(f => (double)f.Rating) : 0;

        return Ok(new { total, averageRating = Math.Round(avg, 2), byStatus, byCategory });
    }
}
