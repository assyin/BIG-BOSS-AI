using BigBoss.Infrastructure.Data;
using BigBoss.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BigBoss.API.Controllers;

[ApiController]
[Route("api/admin/push")]
[Authorize(Roles = "Admin")]
public class AdminPushController : ControllerBase
{
    private readonly IPushNotificationService _pushService;
    private readonly BigBossDbContext _context;

    public AdminPushController(IPushNotificationService pushService, BigBossDbContext context)
    {
        _pushService = pushService;
        _context = context;
    }

    /// <summary>
    /// Send a test push notification to a specific user (by email or user id).
    /// </summary>
    [HttpPost("test")]
    public async Task<IActionResult> SendTest([FromBody] TestPushRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Title) || string.IsNullOrWhiteSpace(req.Body))
            return BadRequest(new { error = "Title and Body are required" });

        Guid userId;
        if (req.UserId.HasValue)
        {
            userId = req.UserId.Value;
        }
        else if (!string.IsNullOrWhiteSpace(req.Email))
        {
            var user = await _context.Users.AsNoTracking()
                .FirstOrDefaultAsync(u => u.Email == req.Email.ToLower());
            if (user == null) return NotFound(new { error = $"User not found: {req.Email}" });
            userId = user.Id;
        }
        else
        {
            return BadRequest(new { error = "Either UserId or Email is required" });
        }

        await _pushService.SendToUserAsync(userId, req.Title, req.Body, req.Data);
        return Ok(new { sent = true, userId, req.Title, req.Body });
    }

    /// <summary>
    /// Broadcast a push notification to ALL users with NotificationsEnabled = true.
    /// Use with caution.
    /// </summary>
    [HttpPost("broadcast")]
    public async Task<IActionResult> Broadcast([FromBody] BroadcastPushRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Title) || string.IsNullOrWhiteSpace(req.Body))
            return BadRequest(new { error = "Title and Body are required" });

        if (!req.Confirm)
            return BadRequest(new { error = "Set 'confirm' = true to broadcast to all users" });

        await _pushService.SendToAllAsync(req.Title, req.Body, req.Data);
        return Ok(new { sent = true, req.Title, req.Body });
    }

    /// <summary>
    /// Quick health check: count users with active push tokens.
    /// </summary>
    [HttpGet("stats")]
    public async Task<IActionResult> Stats()
    {
        var withToken = await _context.Users.CountAsync(u => u.PushToken != null);
        var enabled = await _context.Users.CountAsync(u => u.PushToken != null && u.NotificationsEnabled && !u.IsSuspended);
        var total = await _context.Users.CountAsync();
        return Ok(new { total, withToken, enabledForPush = enabled });
    }
}

public class TestPushRequest
{
    public Guid? UserId { get; set; }
    public string? Email { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public object? Data { get; set; }
}

public class BroadcastPushRequest
{
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public object? Data { get; set; }
    public bool Confirm { get; set; } = false;
}
