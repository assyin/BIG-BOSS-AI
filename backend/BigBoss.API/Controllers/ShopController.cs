using BigBoss.Core.Entities;
using BigBoss.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BigBoss.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ShopController : ControllerBase
{
    private readonly IShopService _shopService;

    public ShopController(IShopService shopService) => _shopService = shopService;

    [HttpGet("rewards")]
    public async Task<IActionResult> GetRewards([FromQuery] RewardCategory? category = null)
    {
        var rewards = await _shopService.GetAvailableRewardsAsync(category);
        return Ok(rewards);
    }

    [HttpGet("rewards/{id}")]
    public async Task<IActionResult> GetReward(Guid id)
    {
        var reward = await _shopService.GetRewardAsync(id);
        if (reward == null) return NotFound();
        return Ok(reward);
    }

    [HttpPost("redeem")]
    public async Task<IActionResult> Redeem([FromBody] RedeemRequest request)
    {
        var userId = GetUserId();
        var result = await _shopService.RedeemAsync(userId, request.RewardId, request.ShippingAddress);
        if (!result.Success) return BadRequest(new { message = result.Error });
        return Ok(result.Redemption);
    }

    [HttpGet("redemptions")]
    public async Task<IActionResult> GetRedemptions()
    {
        var userId = GetUserId();
        var redemptions = await _shopService.GetUserRedemptionsAsync(userId);
        return Ok(redemptions);
    }

    private Guid GetUserId()
    {
        var claim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (claim == null || !Guid.TryParse(claim.Value, out var id)) throw new UnauthorizedAccessException();
        return id;
    }
}

[ApiController]
[Route("api/admin/shop")]
[Authorize(Roles = "Admin")]
public class AdminShopController : ControllerBase
{
    private readonly IShopService _shopService;

    public AdminShopController(IShopService shopService) => _shopService = shopService;

    [HttpGet("rewards")]
    public async Task<IActionResult> GetAll() => Ok(await _shopService.GetAvailableRewardsAsync());

    [HttpPost("rewards")]
    public async Task<IActionResult> Create([FromBody] ShopReward reward) => Ok(await _shopService.CreateRewardAsync(reward));

    [HttpPut("rewards/{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] ShopReward updates)
    {
        var result = await _shopService.UpdateRewardAsync(id, updates);
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpGet("redemptions")]
    public async Task<IActionResult> GetRedemptions([FromQuery] RedemptionStatus? status = null)
        => Ok(await _shopService.GetAllRedemptionsAsync(status));

    [HttpPut("redemptions/{id}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateStatusRequest request)
    {
        var adminId = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
        var ok = await _shopService.UpdateRedemptionStatusAsync(id, request.Status, adminId, request.Notes);
        if (!ok) return NotFound();
        return Ok(new { message = "Statut mis a jour" });
    }
}

public class RedeemRequest { public Guid RewardId { get; set; } public string? ShippingAddress { get; set; } }
public class UpdateStatusRequest { public RedemptionStatus Status { get; set; } public string? Notes { get; set; } }
