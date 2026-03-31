using BigBoss.Core.DTOs.BodyStats;
using BigBoss.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BigBoss.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BodyStatsController : ControllerBase
{
    private readonly IBodyStatService _bodyStatService;
    private readonly ILogger<BodyStatsController> _logger;

    public BodyStatsController(IBodyStatService bodyStatService, ILogger<BodyStatsController> logger)
    {
        _bodyStatService = bodyStatService;
        _logger = logger;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    /// <summary>
    /// Get all body stats for the current user
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<BodyStatDto>>> GetAll()
    {
        var userId = GetUserId();
        var stats = await _bodyStatService.GetByUserIdAsync(userId);
        return Ok(stats);
    }

    /// <summary>
    /// Get latest body stat for the current user
    /// </summary>
    [HttpGet("latest")]
    public async Task<ActionResult<BodyStatDto>> GetLatest()
    {
        var userId = GetUserId();
        var stat = await _bodyStatService.GetLatestAsync(userId);

        if (stat == null)
            return NotFound(new { message = "Aucune mesure trouvee" });

        return Ok(stat);
    }

    /// <summary>
    /// Get body stat by ID
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<BodyStatDto>> GetById(Guid id)
    {
        var userId = GetUserId();
        var stat = await _bodyStatService.GetByIdAsync(id, userId);

        if (stat == null)
            return NotFound(new { message = "Mesure non trouvee" });

        return Ok(stat);
    }

    /// <summary>
    /// Create a new body stat
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<BodyStatDto>> Create([FromBody] CreateBodyStatDto dto)
    {
        var userId = GetUserId();
        var stat = await _bodyStatService.CreateAsync(userId, dto);
        return CreatedAtAction(nameof(GetById), new { id = stat.Id }, stat);
    }

    /// <summary>
    /// Update a body stat
    /// </summary>
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<BodyStatDto>> Update(Guid id, [FromBody] UpdateBodyStatDto dto)
    {
        var userId = GetUserId();
        var stat = await _bodyStatService.UpdateAsync(id, userId, dto);

        if (stat == null)
            return NotFound(new { message = "Mesure non trouvee" });

        return Ok(stat);
    }

    /// <summary>
    /// Delete a body stat
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = GetUserId();
        var result = await _bodyStatService.DeleteAsync(id, userId);

        if (!result)
            return NotFound(new { message = "Mesure non trouvee" });

        return NoContent();
    }
}
