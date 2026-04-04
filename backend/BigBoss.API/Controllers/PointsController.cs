using BigBoss.Core.Entities;
using BigBoss.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BigBoss.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PointsController : ControllerBase
{
    private readonly IPointsService _pointsService;
    private readonly IStreakService _streakService;

    public PointsController(IPointsService pointsService, IStreakService streakService)
    {
        _pointsService = pointsService;
        _streakService = streakService;
    }

    [HttpGet("balance")]
    public async Task<IActionResult> GetBalance()
    {
        var userId = GetCurrentUserId();
        var balance = await _pointsService.GetBalanceAsync(userId);
        return Ok(balance);
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetHistory([FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] PointTransactionType? type = null)
    {
        var userId = GetCurrentUserId();
        var history = await _pointsService.GetHistoryAsync(userId, page, pageSize, type);
        return Ok(history);
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetMonthlySummary()
    {
        var userId = GetCurrentUserId();
        var summary = await _pointsService.GetMonthlySummaryAsync(userId);
        return Ok(summary);
    }

    [HttpGet("streak")]
    public async Task<IActionResult> GetStreak()
    {
        var userId = GetCurrentUserId();
        var streak = await _streakService.GetStreakAsync(userId);
        return Ok(streak);
    }

    [HttpGet("streak/calendar")]
    public async Task<IActionResult> GetStreakCalendar([FromQuery] int year, [FromQuery] int month)
    {
        var userId = GetCurrentUserId();
        if (year == 0) year = DateTime.UtcNow.Year;
        if (month == 0) month = DateTime.UtcNow.Month;
        var dates = await _streakService.GetActivityCalendarAsync(userId, year, month);
        return Ok(dates);
    }

    private Guid GetCurrentUserId()
    {
        var claim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (claim == null || !Guid.TryParse(claim.Value, out var userId))
            throw new UnauthorizedAccessException();
        return userId;
    }
}
