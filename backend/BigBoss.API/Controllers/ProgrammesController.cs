using BigBoss.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BigBoss.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProgrammesController : ControllerBase
{
    private readonly IProgrammeService _programmeService;
    private readonly ILogger<ProgrammesController> _logger;

    public ProgrammesController(IProgrammeService programmeService, ILogger<ProgrammesController> logger)
    {
        _programmeService = programmeService;
        _logger = logger;
    }

    /// <summary>
    /// Generate a new programme based on user profile
    /// </summary>
    [HttpPost("generate")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GenerateProgramme()
    {
        var userId = GetCurrentUserId();
        var programme = await _programmeService.GenerateProgrammeAsync(userId);
        return Ok(programme);
    }

    /// <summary>
    /// Get the user's currently active programme
    /// </summary>
    [HttpGet("active")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> GetActiveProgramme()
    {
        var userId = GetCurrentUserId();
        var programme = await _programmeService.GetActiveProgrammeAsync(userId);
        if (programme == null) return NoContent();
        return Ok(programme);
    }

    /// <summary>
    /// Get a specific programme by id
    /// </summary>
    [HttpGet("{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProgramme(Guid id)
    {
        var userId = GetCurrentUserId();
        var programme = await _programmeService.GetProgrammeAsync(id, userId);
        if (programme == null) return NotFound();
        return Ok(programme);
    }

    /// <summary>
    /// Get today's planned session for a programme
    /// </summary>
    [HttpGet("{id}/today")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> GetTodaySession(Guid id)
    {
        var userId = GetCurrentUserId();

        // Mark missed sessions first
        await _programmeService.UpdateMissedSessionsAsync(id);

        var session = await _programmeService.GetTodaySessionAsync(id, userId);
        if (session == null) return NoContent();
        return Ok(session);
    }

    /// <summary>
    /// Get all sessions for a specific week
    /// </summary>
    [HttpGet("{id}/week/{weekNumber}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetWeekSessions(Guid id, int weekNumber)
    {
        // Verify programme belongs to user
        var userId = GetCurrentUserId();
        var programme = await _programmeService.GetProgrammeAsync(id, userId);
        if (programme == null) return NotFound();

        var sessions = await _programmeService.GetWeekSessionsAsync(id, weekNumber);
        return Ok(sessions);
    }

    /// <summary>
    /// Start a programme session (creates a real Session for the workout flow)
    /// </summary>
    [HttpPost("{id}/sessions/{psId}/start")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> StartProgrammeSession(Guid id, Guid psId)
    {
        var userId = GetCurrentUserId();
        var session = await _programmeService.StartProgrammeSessionAsync(id, psId, userId);
        return Ok(session);
    }

    /// <summary>
    /// Mark a programme session as completed
    /// </summary>
    [HttpPost("{id}/sessions/{psId}/complete")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CompleteProgrammeSession(Guid id, Guid psId)
    {
        var userId = GetCurrentUserId();
        await _programmeService.CompleteProgrammeSessionAsync(id, psId, userId);
        return Ok(new { message = "Seance completee avec succes" });
    }

    /// <summary>
    /// Pause the programme
    /// </summary>
    [HttpPut("{id}/pause")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> PauseProgramme(Guid id)
    {
        var userId = GetCurrentUserId();
        await _programmeService.PauseProgrammeAsync(id, userId);
        return Ok(new { message = "Programme mis en pause" });
    }

    /// <summary>
    /// Resume a paused programme
    /// </summary>
    [HttpPut("{id}/resume")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ResumeProgramme(Guid id)
    {
        var userId = GetCurrentUserId();
        await _programmeService.ResumeProgrammeAsync(id, userId);
        return Ok(new { message = "Programme repris" });
    }

    /// <summary>
    /// Abandon a programme
    /// </summary>
    [HttpPut("{id}/abandon")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> AbandonProgramme(Guid id)
    {
        var userId = GetCurrentUserId();
        await _programmeService.AbandonProgrammeAsync(id, userId);
        return Ok(new { message = "Programme abandonne" });
    }

    /// <summary>
    /// Get programme progress stats
    /// </summary>
    [HttpGet("{id}/progress")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProgress(Guid id)
    {
        var userId = GetCurrentUserId();
        var progress = await _programmeService.GetProgressAsync(id, userId);
        return Ok(progress);
    }

    /// <summary>
    /// Get the nutrition plan for a programme
    /// </summary>
    [HttpGet("{id}/nutrition")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetNutritionPlan(Guid id)
    {
        var userId = GetCurrentUserId();
        var programme = await _programmeService.GetProgrammeAsync(id, userId);
        if (programme == null) return NotFound();

        var nutrition = await _programmeService.GetNutritionPlanAsync(id);
        return Ok(nutrition);
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
