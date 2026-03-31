using BigBoss.Core.DTOs.Sessions;
using BigBoss.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BigBoss.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SessionsController : ControllerBase
{
    private readonly ISessionService _sessionService;
    private readonly ILogger<SessionsController> _logger;

    public SessionsController(ISessionService sessionService, ILogger<SessionsController> logger)
    {
        _sessionService = sessionService;
        _logger = logger;
    }

    /// <summary>
    /// Generate a new AI-powered workout session
    /// </summary>
    [HttpPost("generate")]
    [ProducesResponseType(typeof(SessionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<SessionDto>> GenerateSession([FromBody] GenerateSessionRequest request)
    {
        var userId = GetCurrentUserId();
        var session = await _sessionService.GenerateSessionAsync(userId, request);
        return Ok(session);
    }

    /// <summary>
    /// Get user's sessions history
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<SessionDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<SessionDto>>> GetSessions([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var userId = GetCurrentUserId();
        var sessions = await _sessionService.GetUserSessionsAsync(userId, page, pageSize);
        return Ok(sessions);
    }

    /// <summary>
    /// Get session details
    /// </summary>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(SessionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SessionDto>> GetSession(Guid id)
    {
        var userId = GetCurrentUserId();
        var session = await _sessionService.GetSessionAsync(id, userId);

        if (session == null)
        {
            return NotFound();
        }

        return Ok(session);
    }

    /// <summary>
    /// Start a generated session
    /// </summary>
    [HttpPost("{id}/start")]
    [ProducesResponseType(typeof(SessionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SessionDto>> StartSession(Guid id)
    {
        var userId = GetCurrentUserId();
        var session = await _sessionService.StartSessionAsync(id, userId);
        return Ok(session);
    }

    /// <summary>
    /// Log a completed set during a session
    /// </summary>
    [HttpPost("log-set")]
    [ProducesResponseType(typeof(SessionExerciseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<SessionExerciseDto>> LogSet([FromBody] LogSetRequest request)
    {
        var userId = GetCurrentUserId();
        var exercise = await _sessionService.LogSetAsync(userId, request);
        return Ok(exercise);
    }

    /// <summary>
    /// Skip an exercise in a session
    /// </summary>
    [HttpPost("skip")]
    [ProducesResponseType(typeof(SessionExerciseDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<SessionExerciseDto>> SkipExercise([FromBody] SkipExerciseRequest request)
    {
        var userId = GetCurrentUserId();
        var exercise = await _sessionService.SkipExerciseAsync(userId, request);
        return Ok(exercise);
    }

    /// <summary>
    /// Complete a session and get summary
    /// </summary>
    [HttpPost("{id}/complete")]
    [ProducesResponseType(typeof(SessionSummaryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SessionSummaryDto>> CompleteSession(Guid id)
    {
        var userId = GetCurrentUserId();
        var summary = await _sessionService.CompleteSessionAsync(id, userId);
        return Ok(summary);
    }

    /// <summary>
    /// Abandon a session
    /// </summary>
    [HttpPost("{id}/abandon")]
    [ProducesResponseType(typeof(SessionDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<SessionDto>> AbandonSession(Guid id)
    {
        var userId = GetCurrentUserId();
        var session = await _sessionService.AbandonSessionAsync(id, userId);
        return Ok(session);
    }

    /// <summary>
    /// Get current active session if any
    /// </summary>
    [HttpGet("current")]
    [ProducesResponseType(typeof(SessionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> GetCurrentSession()
    {
        var userId = GetCurrentUserId();
        var session = await _sessionService.GetCurrentActiveSessionAsync(userId);

        if (session == null)
        {
            return NoContent();
        }

        var sessionDto = await _sessionService.GetSessionAsync(session.Id, userId);
        return Ok(sessionDto);
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
