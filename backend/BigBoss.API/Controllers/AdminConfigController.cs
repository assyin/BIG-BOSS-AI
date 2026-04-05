using BigBoss.Core.Entities;
using BigBoss.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BigBoss.API.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminConfigController : ControllerBase
{
    private readonly BigBossDbContext _context;

    public AdminConfigController(BigBossDbContext context) => _context = context;

    // ─── NOTIFICATIONS ───

    [HttpGet("notifications/templates")]
    public async Task<IActionResult> GetTemplates()
        => Ok(await _context.NotificationTemplates.AsNoTracking().OrderBy(t => t.TriggerKey).ToListAsync());

    [HttpPut("notifications/templates/{id}")]
    public async Task<IActionResult> UpdateTemplate(Guid id, [FromBody] NotificationTemplate updates)
    {
        var t = await _context.NotificationTemplates.FindAsync(id);
        if (t == null) return NotFound();

        t.TitleFr = updates.TitleFr;
        t.TitleAr = updates.TitleAr;
        t.BodyFr = updates.BodyFr;
        t.BodyAr = updates.BodyAr;
        t.IsActive = updates.IsActive;
        t.WithCoachVoice = updates.WithCoachVoice;
        t.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return Ok(t);
    }

    [HttpPost("notifications/templates")]
    public async Task<IActionResult> CreateTemplate([FromBody] NotificationTemplate template)
    {
        template.Id = Guid.NewGuid();
        template.CreatedAt = DateTime.UtcNow;
        _context.NotificationTemplates.Add(template);
        await _context.SaveChangesAsync();
        return Ok(template);
    }

    // ─── APP CONFIG ───

    [HttpGet("config/global")]
    public async Task<IActionResult> GetAppConfigs([FromQuery] string? category = null)
    {
        var query = _context.AppConfigs.AsNoTracking();
        if (!string.IsNullOrEmpty(category))
            query = query.Where(c => c.Category == category);
        return Ok(await query.OrderBy(c => c.Category).ThenBy(c => c.Key).ToListAsync());
    }

    [HttpPut("config/global/{key}")]
    public async Task<IActionResult> UpdateAppConfig(string key, [FromBody] UpdateConfigValueRequest request)
    {
        var config = await _context.AppConfigs.FirstOrDefaultAsync(c => c.Key == key);
        if (config == null)
        {
            config = new AppConfig { Id = Guid.NewGuid(), Key = key, Value = request.Value, UpdatedAt = DateTime.UtcNow };
            _context.AppConfigs.Add(config);
        }
        else
        {
            config.Value = request.Value;
            config.UpdatedAt = DateTime.UtcNow;
        }
        await _context.SaveChangesAsync();
        return Ok(config);
    }

    // ─── FEATURE FLAGS ───

    [HttpGet("config/feature-flags")]
    public async Task<IActionResult> GetFeatureFlags()
        => Ok(await _context.FeatureFlags.AsNoTracking().OrderBy(f => f.Key).ToListAsync());

    [HttpPut("config/feature-flags/{key}")]
    public async Task<IActionResult> ToggleFeatureFlag(string key, [FromBody] ToggleFlagRequest request)
    {
        var flag = await _context.FeatureFlags.FirstOrDefaultAsync(f => f.Key == key);
        if (flag == null) return NotFound();
        flag.IsEnabled = request.IsEnabled;
        flag.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Ok(flag);
    }

    // ─── AUDIT LOG ───

    [HttpGet("audit-log")]
    public async Task<IActionResult> GetAuditLog([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var logs = await _context.AdminAuditLogs.AsNoTracking()
            .OrderByDescending(l => l.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
        return Ok(logs);
    }

    // ─── CHALLENGE REWARDS ───

    [HttpGet("challenges/{challengeId}/rewards")]
    public async Task<IActionResult> GetChallengeRewards(Guid challengeId)
        => Ok(await _context.ChallengeRewards.AsNoTracking().Where(r => r.ChallengeId == challengeId).OrderBy(r => r.RankFrom).ToListAsync());

    [HttpPost("challenges/{challengeId}/rewards")]
    public async Task<IActionResult> AddChallengeReward(Guid challengeId, [FromBody] ChallengeReward reward)
    {
        reward.Id = Guid.NewGuid();
        reward.ChallengeId = challengeId;
        _context.ChallengeRewards.Add(reward);
        await _context.SaveChangesAsync();
        return Ok(reward);
    }

    [HttpDelete("challenges/rewards/{id}")]
    public async Task<IActionResult> DeleteChallengeReward(Guid id)
    {
        var r = await _context.ChallengeRewards.FindAsync(id);
        if (r == null) return NotFound();
        _context.ChallengeRewards.Remove(r);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}

public class UpdateConfigValueRequest { public string Value { get; set; } = string.Empty; }
public class ToggleFlagRequest { public bool IsEnabled { get; set; } }
