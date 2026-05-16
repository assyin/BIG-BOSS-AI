using BigBoss.Core.DTOs.Lives;
using BigBoss.Core.Interfaces;
using BigBoss.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BigBoss.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class LivesController : ControllerBase
{
    private readonly ILiveService _liveService;
    private readonly IPushNotificationService _pushService;
    private readonly ILogger<LivesController> _logger;

    public LivesController(ILiveService liveService, IPushNotificationService pushService, ILogger<LivesController> logger)
    {
        _liveService = liveService;
        _pushService = pushService;
        _logger = logger;
    }

    /// <summary>
    /// Get all lives
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<LiveListDto>>> GetAll()
    {
        var lives = await _liveService.GetAllAsync();
        return Ok(lives);
    }

    /// <summary>
    /// Get upcoming lives
    /// </summary>
    [HttpGet("upcoming")]
    public async Task<ActionResult<IEnumerable<LiveListDto>>> GetUpcoming([FromQuery] int count = 10)
    {
        var lives = await _liveService.GetUpcomingAsync(count);
        return Ok(lives);
    }

    /// <summary>
    /// Get live by ID
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<LiveDto>> GetById(Guid id)
    {
        var live = await _liveService.GetByIdAsync(id);

        if (live == null)
            return NotFound(new { message = "Live non trouve" });

        return Ok(live);
    }

    /// <summary>
    /// Create a new live (Admin only)
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<LiveDto>> Create([FromBody] CreateLiveDto dto)
    {
        var live = await _liveService.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = live.Id }, live);
    }

    /// <summary>
    /// Update a live (Admin only)
    /// </summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<LiveDto>> Update(Guid id, [FromBody] UpdateLiveDto dto)
    {
        var live = await _liveService.UpdateAsync(id, dto);

        if (live == null)
            return NotFound(new { message = "Live non trouve" });

        return Ok(live);
    }

    /// <summary>
    /// Announce a live: broadcast push to all users (Admin only).
    /// Appeler typiquement 5-10 minutes avant le start.
    /// </summary>
    [HttpPost("{id:guid}/announce")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Announce(Guid id)
    {
        var live = await _liveService.GetByIdAsync(id);
        if (live == null)
            return NotFound(new { message = "Live non trouve" });

        var title = "🔴 LIVE qui commence !";
        var body = $"{live.Title} — rejoins ton coach maintenant";
        await _pushService.SendToAllAsync(title, body, new { liveId = id, type = "live_announce" });

        _logger.LogInformation("Live {LiveId} announced via push: {Title}", id, live.Title);
        return Ok(new { announced = true, liveId = id, title, body });
    }

    /// <summary>
    /// Delete a live (Admin only)
    /// </summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _liveService.DeleteAsync(id);

        if (!result)
            return NotFound(new { message = "Live non trouve" });

        return NoContent();
    }
}
