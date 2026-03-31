using BigBoss.Core.DTOs.Nutrition;
using BigBoss.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BigBoss.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NutritionController : ControllerBase
{
    private readonly INutritionService _nutritionService;
    private readonly ILogger<NutritionController> _logger;

    public NutritionController(INutritionService nutritionService, ILogger<NutritionController> logger)
    {
        _nutritionService = nutritionService;
        _logger = logger;
    }

    /// <summary>
    /// Log a meal manually
    /// </summary>
    [HttpPost("meals")]
    [ProducesResponseType(typeof(MealDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<MealDto>> LogMeal([FromBody] MealLogRequest request)
    {
        var userId = GetCurrentUserId();
        var meal = await _nutritionService.LogMealAsync(userId, request);
        return Ok(meal);
    }

    /// <summary>
    /// Scan a meal photo with AI
    /// </summary>
    [HttpPost("scan")]
    [ProducesResponseType(typeof(ScanMealResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ScanMealResponse>> ScanMeal([FromBody] ScanMealRequest request)
    {
        var userId = GetCurrentUserId();
        var result = await _nutritionService.ScanMealAsync(userId, request);
        return Ok(result);
    }

    /// <summary>
    /// Get nutrition data for a specific day
    /// </summary>
    [HttpGet("day")]
    [ProducesResponseType(typeof(NutritionDayDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<NutritionDayDto>> GetDayNutrition([FromQuery] DateTime? date = null)
    {
        var userId = GetCurrentUserId();
        var targetDate = date ?? DateTime.UtcNow;
        var nutrition = await _nutritionService.GetDayNutritionAsync(userId, targetDate);
        return Ok(nutrition);
    }

    /// <summary>
    /// Get weekly nutrition summary
    /// </summary>
    [HttpGet("week")]
    [ProducesResponseType(typeof(WeeklyNutritionSummaryDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<WeeklyNutritionSummaryDto>> GetWeekSummary([FromQuery] DateTime? weekStart = null)
    {
        var userId = GetCurrentUserId();
        var start = weekStart ?? DateTime.UtcNow.AddDays(-(int)DateTime.UtcNow.DayOfWeek);
        var summary = await _nutritionService.GetWeekSummaryAsync(userId, start);
        return Ok(summary);
    }

    /// <summary>
    /// Get calculated nutrition targets for the user
    /// </summary>
    [HttpGet("targets")]
    [ProducesResponseType(typeof(NutritionTargetsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<NutritionTargetsDto>> GetTargets()
    {
        var userId = GetCurrentUserId();
        var targets = await _nutritionService.CalculateTargetsAsync(userId);
        return Ok(targets);
    }

    /// <summary>
    /// Delete a logged meal
    /// </summary>
    [HttpDelete("meals/{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteMeal(Guid id)
    {
        var userId = GetCurrentUserId();
        var deleted = await _nutritionService.DeleteMealAsync(id, userId);

        if (!deleted)
        {
            return NotFound();
        }

        return NoContent();
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
        {
            throw new UnauthorizedAccessException("User not authenticated");
        }
        return userId;
    }
}
