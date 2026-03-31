using BigBoss.Core.DTOs.Challenges;
using BigBoss.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BigBoss.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ChallengesController : ControllerBase
{
    private readonly IChallengeService _challengeService;
    private readonly ILogger<ChallengesController> _logger;

    public ChallengesController(IChallengeService challengeService, ILogger<ChallengesController> logger)
    {
        _challengeService = challengeService;
        _logger = logger;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    /// <summary>
    /// Get all active challenges
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ChallengeDto>>> GetActive()
    {
        var userId = GetUserId();
        var challenges = await _challengeService.GetActiveChallengesAsync(userId);
        return Ok(challenges);
    }

    /// <summary>
    /// Get featured challenges
    /// </summary>
    [HttpGet("featured")]
    public async Task<ActionResult<IEnumerable<ChallengeDto>>> GetFeatured()
    {
        var userId = GetUserId();
        var challenges = await _challengeService.GetFeaturedChallengesAsync(userId);
        return Ok(challenges);
    }

    /// <summary>
    /// Get challenge by ID
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ChallengeDto>> GetById(Guid id)
    {
        var userId = GetUserId();
        var challenge = await _challengeService.GetByIdAsync(id, userId);

        if (challenge == null)
            return NotFound(new { message = "Challenge non trouvé" });

        return Ok(challenge);
    }

    /// <summary>
    /// Get challenge leaderboard
    /// </summary>
    [HttpGet("{id:guid}/leaderboard")]
    public async Task<ActionResult<ChallengeLeaderboardDto>> GetLeaderboard(Guid id, [FromQuery] int top = 10)
    {
        var leaderboard = await _challengeService.GetLeaderboardAsync(id, top);

        if (leaderboard == null)
            return NotFound(new { message = "Challenge non trouvé" });

        return Ok(leaderboard);
    }

    /// <summary>
    /// Create a new challenge (Admin only)
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ChallengeDto>> Create([FromBody] CreateChallengeDto dto)
    {
        var challenge = await _challengeService.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = challenge.Id }, challenge);
    }

    /// <summary>
    /// Update a challenge (Admin only)
    /// </summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ChallengeDto>> Update(Guid id, [FromBody] UpdateChallengeDto dto)
    {
        var challenge = await _challengeService.UpdateAsync(id, dto);

        if (challenge == null)
            return NotFound(new { message = "Challenge non trouvé" });

        return Ok(challenge);
    }

    /// <summary>
    /// Delete a challenge (Admin only)
    /// </summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _challengeService.DeleteAsync(id);

        if (!result)
            return NotFound(new { message = "Challenge non trouvé" });

        return NoContent();
    }
}
