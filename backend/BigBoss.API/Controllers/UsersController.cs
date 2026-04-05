using BigBoss.Core.DTOs.Users;
using BigBoss.Core.Interfaces;
using BigBoss.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BigBoss.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly IPushNotificationService _pushService;
    private readonly ILogger<UsersController> _logger;

    public UsersController(IUserService userService, IPushNotificationService pushService, ILogger<UsersController> logger)
    {
        _userService = userService;
        _pushService = pushService;
        _logger = logger;
    }

    /// <summary>
    /// Get current user's profile
    /// </summary>
    [HttpGet("me")]
    [ProducesResponseType(typeof(UserProfileDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UserProfileDto>> GetProfile()
    {
        var userId = GetCurrentUserId();
        var profile = await _userService.GetProfileAsync(userId);

        if (profile == null)
        {
            return NotFound();
        }

        return Ok(profile);
    }

    /// <summary>
    /// Update current user's profile
    /// </summary>
    [HttpPut("me")]
    [ProducesResponseType(typeof(UserProfileDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<UserProfileDto>> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var userId = GetCurrentUserId();
        var profile = await _userService.UpdateProfileAsync(userId, request);
        return Ok(profile);
    }

    /// <summary>
    /// Get current user's stats
    /// </summary>
    [HttpGet("me/stats")]
    [ProducesResponseType(typeof(UserStatsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<UserStatsDto>> GetStats()
    {
        var userId = GetCurrentUserId();
        var stats = await _userService.GetStatsAsync(userId);
        return Ok(stats);
    }

    /// <summary>
    /// Complete premium onboarding
    /// </summary>
    [HttpPost("onboarding")]
    [ProducesResponseType(typeof(UserProfileDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<UserProfileDto>> CompleteOnboarding([FromBody] OnboardingRequest request)
    {
        var userId = GetCurrentUserId();
        var profile = await _userService.CompleteOnboardingAsync(userId, request);
        return Ok(profile);
    }

    /// <summary>
    /// Delete current user's account
    /// </summary>
    [HttpDelete("me")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteAccount()
    {
        var userId = GetCurrentUserId();
        await _userService.DeleteAccountAsync(userId);
        return NoContent();
    }

    [HttpPost("push-token")]
    public async Task<IActionResult> SavePushToken([FromBody] PushTokenRequest request)
    {
        var userId = GetCurrentUserId();
        await _pushService.SaveTokenAsync(userId, request.Token);
        return Ok(new { message = "Token enregistre" });
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

public class PushTokenRequest { public string Token { get; set; } = string.Empty; }
