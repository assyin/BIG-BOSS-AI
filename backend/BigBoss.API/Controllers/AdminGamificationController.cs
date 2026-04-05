using BigBoss.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BigBoss.API.Controllers;

[ApiController]
[Route("api/admin/gamification")]
[Authorize(Roles = "Admin")]
public class AdminGamificationController : ControllerBase
{
    private readonly IGamificationConfigService _configService;
    private readonly IPointsService _pointsService;
    private readonly IAntiCheatService _antiCheatService;

    public AdminGamificationController(IGamificationConfigService configService, IPointsService pointsService, IAntiCheatService antiCheatService)
    {
        _configService = configService;
        _pointsService = pointsService;
        _antiCheatService = antiCheatService;
    }

    [HttpGet("config")]
    public async Task<IActionResult> GetAllConfig([FromQuery] string? category = null)
    {
        var configs = await _configService.GetAllAsync(category);
        return Ok(configs);
    }

    [HttpGet("config/{key}")]
    public async Task<IActionResult> GetConfig(string key)
    {
        var config = await _configService.GetByKeyAsync(key);
        if (config == null) return NotFound();
        return Ok(config);
    }

    [HttpPut("config/{key}")]
    public async Task<IActionResult> UpdateConfig(string key, [FromBody] UpdateConfigRequest request)
    {
        var adminId = GetCurrentUserId();
        await _configService.SetAsync(key, request.Value, adminId);
        return Ok(new { message = "Config mise a jour", key, value = request.Value });
    }

    [HttpPost("points/adjust")]
    public async Task<IActionResult> AdjustPoints([FromBody] AdjustPointsRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Reason))
            return BadRequest(new { message = "Motif obligatoire" });

        var result = await _pointsService.AwardPointsAsync(new PointAwardRequest
        {
            UserId = request.UserId,
            Amount = request.Amount,
            Type = Core.Entities.PointTransactionType.AdminAdjustment,
            Reason = $"[Admin] {request.Reason}",
            IdempotencyKey = $"admin_adjust:{Guid.NewGuid()}"
        });

        return Ok(result);
    }

    [HttpPost("points/clawback")]
    public async Task<IActionResult> ClawbackPoints([FromBody] AdjustPointsRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Reason))
            return BadRequest(new { message = "Motif obligatoire" });

        var result = await _pointsService.AwardPointsAsync(new PointAwardRequest
        {
            UserId = request.UserId,
            Amount = -Math.Abs(request.Amount),
            Type = Core.Entities.PointTransactionType.Clawback,
            Reason = $"[Clawback] {request.Reason}",
            IdempotencyKey = $"clawback:{Guid.NewGuid()}"
        });

        return Ok(result);
    }

    // ─── ANTI-CHEAT ───

    [HttpGet("anticheat/flagged")]
    public async Task<IActionResult> GetFlaggedUsers([FromQuery] string? status = null)
    {
        var flagged = await _antiCheatService.GetFlaggedUsersAsync(status);
        return Ok(flagged);
    }

    [HttpPost("anticheat/resolve")]
    public async Task<IActionResult> ResolveFlag([FromBody] ResolveFlagRequest request)
    {
        var adminId = GetCurrentUserId();
        await _antiCheatService.ResolveFlag(request.UserId, request.Resolution, adminId);
        return Ok(new { message = $"User {request.Resolution}" });
    }

    private Guid GetCurrentUserId()
    {
        var claim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        return claim != null && Guid.TryParse(claim.Value, out var id) ? id : Guid.Empty;
    }
}

public class UpdateConfigRequest
{
    public string Value { get; set; } = string.Empty;
}

public class AdjustPointsRequest
{
    public Guid UserId { get; set; }
    public int Amount { get; set; }
    public string Reason { get; set; } = string.Empty;
}

public class ResolveFlagRequest
{
    public Guid UserId { get; set; }
    public string Resolution { get; set; } = string.Empty; // "innocent", "disqualify", "ban"
}
