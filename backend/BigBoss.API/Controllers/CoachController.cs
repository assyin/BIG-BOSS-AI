using BigBoss.Core.DTOs.Coach;
using BigBoss.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BigBoss.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CoachController : ControllerBase
{
    private readonly ICoachService _coachService;
    private readonly ILogger<CoachController> _logger;

    public CoachController(ICoachService coachService, ILogger<CoachController> logger)
    {
        _coachService = coachService;
        _logger = logger;
    }

    /// <summary>
    /// Send a message to the AI coach
    /// </summary>
    [HttpPost("message")]
    [ProducesResponseType(typeof(CoachMessageResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<CoachMessageResponse>> SendMessage([FromBody] CoachMessageRequest request)
    {
        var userId = GetCurrentUserId();
        var response = await _coachService.SendMessageAsync(userId, request);
        return Ok(response);
    }

    /// <summary>
    /// Get conversation history
    /// </summary>
    [HttpGet("history")]
    [ProducesResponseType(typeof(ConversationHistoryDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<ConversationHistoryDto>> GetHistory([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var userId = GetCurrentUserId();
        var history = await _coachService.GetConversationHistoryAsync(userId, page, pageSize);
        return Ok(history);
    }

    /// <summary>
    /// Check remaining daily messages
    /// </summary>
    [HttpGet("quota")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetQuota()
    {
        var userId = GetCurrentUserId();
        var count = await _coachService.GetDailyMessageCountAsync(userId);
        var canSend = await _coachService.CanSendMessageAsync(userId);

        return Ok(new
        {
            messagesUsedToday = count,
            canSendMore = canSend
        });
    }

    /// <summary>
    /// Clear conversation history
    /// </summary>
    [HttpDelete("history")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> ClearHistory()
    {
        var userId = GetCurrentUserId();
        await _coachService.ClearConversationHistoryAsync(userId);
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
