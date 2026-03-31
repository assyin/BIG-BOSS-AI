using BigBoss.Core.DTOs.NutritionPlans;
using BigBoss.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BigBoss.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NutritionPlansController : ControllerBase
{
    private readonly INutritionPlanService _nutritionPlanService;
    private readonly ILogger<NutritionPlansController> _logger;

    public NutritionPlansController(INutritionPlanService nutritionPlanService, ILogger<NutritionPlansController> logger)
    {
        _nutritionPlanService = nutritionPlanService;
        _logger = logger;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    /// <summary>
    /// Get all nutrition plans for the current user
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<NutritionPlanDto>>> GetAll()
    {
        var userId = GetUserId();
        var plans = await _nutritionPlanService.GetByUserIdAsync(userId);
        return Ok(plans);
    }

    /// <summary>
    /// Get current week's nutrition plan
    /// </summary>
    [HttpGet("current")]
    public async Task<ActionResult<NutritionPlanDto>> GetCurrentWeek()
    {
        var userId = GetUserId();
        var plan = await _nutritionPlanService.GetCurrentWeekAsync(userId);

        if (plan == null)
            return NotFound(new { message = "Aucun plan nutritionnel pour cette semaine" });

        return Ok(plan);
    }

    /// <summary>
    /// Get nutrition plan by ID
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<NutritionPlanDto>> GetById(Guid id)
    {
        var userId = GetUserId();
        var plan = await _nutritionPlanService.GetByIdAsync(id, userId);

        if (plan == null)
            return NotFound(new { message = "Plan nutritionnel non trouve" });

        return Ok(plan);
    }

    /// <summary>
    /// Create a new nutrition plan
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<NutritionPlanDto>> Create([FromBody] CreateNutritionPlanDto dto)
    {
        var userId = GetUserId();
        var plan = await _nutritionPlanService.CreateAsync(userId, dto);
        return CreatedAtAction(nameof(GetById), new { id = plan.Id }, plan);
    }

    /// <summary>
    /// Update a nutrition plan
    /// </summary>
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<NutritionPlanDto>> Update(Guid id, [FromBody] UpdateNutritionPlanDto dto)
    {
        var userId = GetUserId();
        var plan = await _nutritionPlanService.UpdateAsync(id, userId, dto);

        if (plan == null)
            return NotFound(new { message = "Plan nutritionnel non trouve" });

        return Ok(plan);
    }

    /// <summary>
    /// Delete a nutrition plan
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = GetUserId();
        var result = await _nutritionPlanService.DeleteAsync(id, userId);

        if (!result)
            return NotFound(new { message = "Plan nutritionnel non trouve" });

        return NoContent();
    }
}
