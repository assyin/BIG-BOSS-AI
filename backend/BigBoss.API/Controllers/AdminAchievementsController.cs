using BigBoss.Core.Entities;
using BigBoss.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BigBoss.API.Controllers;

[ApiController]
[Route("api/admin/achievements")]
[Authorize(Roles = "Admin")]
public class AdminAchievementsController : ControllerBase
{
    private readonly BigBossDbContext _context;

    public AdminAchievementsController(BigBossDbContext context) => _context = context;

    [HttpGet]
    public async Task<IActionResult> GetAll()
        => Ok(await _context.Achievements.AsNoTracking().OrderBy(a => a.SortOrder).ToListAsync());

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Achievement achievement)
    {
        achievement.Id = Guid.NewGuid();
        achievement.CreatedAt = DateTime.UtcNow;
        _context.Achievements.Add(achievement);
        await _context.SaveChangesAsync();
        return Ok(achievement);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] Achievement updates)
    {
        var a = await _context.Achievements.FindAsync(id);
        if (a == null) return NotFound();

        a.Title = updates.Title;
        a.TitleAr = updates.TitleAr;
        a.Description = updates.Description;
        a.DescriptionAr = updates.DescriptionAr;
        a.IconUrl = updates.IconUrl;
        a.Category = updates.Category;
        a.TriggerType = updates.TriggerType;
        a.TriggerValue = updates.TriggerValue;
        a.PointsReward = updates.PointsReward;
        a.IsActive = updates.IsActive;
        a.SortOrder = updates.SortOrder;

        await _context.SaveChangesAsync();
        return Ok(a);
    }

    [HttpPost("{id}/assign")]
    public async Task<IActionResult> AssignManually(Guid id, [FromBody] ManualAssignRequest request)
    {
        var exists = await _context.UserAchievements
            .AnyAsync(ua => ua.UserId == request.UserId && ua.AchievementId == id);
        if (exists) return BadRequest(new { message = "Badge deja attribue" });

        var achievement = await _context.Achievements.FindAsync(id);
        if (achievement == null) return NotFound();

        _context.UserAchievements.Add(new UserAchievement
        {
            Id = Guid.NewGuid(),
            UserId = request.UserId,
            AchievementId = id,
            UnlockedAt = DateTime.UtcNow,
            PointsAwarded = achievement.PointsReward,
        });
        await _context.SaveChangesAsync();
        return Ok(new { message = "Badge attribue" });
    }
}

public class ManualAssignRequest { public Guid UserId { get; set; } }
