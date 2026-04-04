using BigBoss.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BigBoss.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AffiliationController : ControllerBase
{
    private readonly IAffiliationService _affiliationService;

    public AffiliationController(IAffiliationService affiliationService)
        => _affiliationService = affiliationService;

    [HttpGet("my-code")]
    public async Task<IActionResult> GetMyCode()
    {
        var userId = GetUserId();
        var code = await _affiliationService.GetOrCreateReferralCodeAsync(userId);
        return Ok(new { code });
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var userId = GetUserId();
        var stats = await _affiliationService.GetStatsAsync(userId);
        return Ok(stats);
    }

    [HttpGet("referrals")]
    public async Task<IActionResult> GetReferrals()
    {
        var userId = GetUserId();
        var referrals = await _affiliationService.GetReferralsAsync(userId);
        return Ok(referrals);
    }

    private Guid GetUserId()
    {
        var claim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (claim == null || !Guid.TryParse(claim.Value, out var id)) throw new UnauthorizedAccessException();
        return id;
    }
}
