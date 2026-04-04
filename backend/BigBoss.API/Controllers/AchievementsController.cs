using BigBoss.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BigBoss.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AchievementsController : ControllerBase
{
    private readonly IAchievementService _achievementService;

    public AchievementsController(IAchievementService achievementService)
        => _achievementService = achievementService;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var userId = GetUserId();
        var achievements = await _achievementService.GetAllForUserAsync(userId);
        return Ok(achievements);
    }

    [HttpGet("unlocked")]
    public async Task<IActionResult> GetUnlocked()
    {
        var userId = GetUserId();
        var unlocked = await _achievementService.GetUnlockedAsync(userId);
        return Ok(unlocked);
    }

    [HttpPost("check")]
    public async Task<IActionResult> Check()
    {
        var userId = GetUserId();
        var newUnlocks = await _achievementService.CheckAndAwardAsync(userId);
        return Ok(new { newUnlocks = newUnlocks.Count, achievements = newUnlocks });
    }

    private Guid GetUserId()
    {
        var claim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (claim == null || !Guid.TryParse(claim.Value, out var id)) throw new UnauthorizedAccessException();
        return id;
    }
}
