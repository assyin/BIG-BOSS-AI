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
    private readonly IChallengeParticipationService _participationService;
    private readonly ILogger<ChallengesController> _logger;

    public ChallengesController(IChallengeService challengeService, IChallengeParticipationService participationService, ILogger<ChallengesController> logger)
    {
        _challengeService = challengeService;
        _participationService = participationService;
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

    // Leaderboard moved to participation endpoints below

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

    // ─── PARTICIPATION ENDPOINTS ───

    [HttpPost("{id:guid}/join")]
    public async Task<IActionResult> Join(Guid id)
    {
        var userId = GetUserId();
        var participation = await _participationService.JoinChallengeAsync(id, userId);
        return Ok(participation);
    }

    [HttpPost("{id:guid}/leave")]
    public async Task<IActionResult> Leave(Guid id)
    {
        var userId = GetUserId();
        await _participationService.LeaveChallengeAsync(id, userId);
        return Ok(new { message = "Challenge quitte" });
    }

    [HttpGet("{id:guid}/my-progress")]
    public async Task<IActionResult> MyProgress(Guid id)
    {
        var userId = GetUserId();
        var progress = await _participationService.GetMyProgressAsync(id, userId);
        if (progress == null) return NotFound(new { message = "Tu ne participes pas a ce challenge" });
        return Ok(progress);
    }

    [HttpGet("{id:guid}/leaderboard")]
    public async Task<IActionResult> Leaderboard(Guid id, [FromQuery] int top = 50)
    {
        var entries = await _participationService.GetLeaderboardAsync(id, top);
        return Ok(entries);
    }

    [HttpGet("my-challenges")]
    public async Task<IActionResult> MyChallenges()
    {
        var userId = GetUserId();
        var challenges = await _participationService.GetMyChallengesAsync(userId);
        return Ok(challenges);
    }

    [HttpPost("{id:guid}/finalize")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Finalize(Guid id)
    {
        await _participationService.FinalizeChallengeAsync(id);
        return Ok(new { message = "Challenge finalise" });
    }

}
