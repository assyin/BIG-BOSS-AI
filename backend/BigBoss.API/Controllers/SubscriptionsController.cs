using BigBoss.Core.Enums;
using BigBoss.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BigBoss.API.Controllers;

[ApiController]
[Route("api/me/subscription")]
[Authorize]
public class SubscriptionsController : ControllerBase
{
    private readonly ISubscriptionService _service;

    public SubscriptionsController(ISubscriptionService service)
    {
        _service = service;
    }

    private Guid GetCurrentUserId()
    {
        var id = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.Parse(id!);
    }

    /// <summary>Retourne l'abonnement courant ou null (Free).</summary>
    [HttpGet]
    public async Task<IActionResult> Current()
    {
        var sub = await _service.GetCurrentAsync(GetCurrentUserId());
        if (sub == null) return Ok(new { tier = "Free", subscription = (object?)null });
        return Ok(new
        {
            tier = sub.Tier.ToString(),
            subscription = new
            {
                id = sub.Id,
                tier = sub.Tier.ToString(),
                status = sub.Status.ToString(),
                period = sub.Period.ToString(),
                provider = sub.Provider.ToString(),
                amountMad = sub.AmountMad,
                startedAt = sub.StartedAt,
                expiresAt = sub.ExpiresAt,
                autoRenew = sub.AutoRenew,
                cancelledAt = sub.CancelledAt,
            },
        });
    }

    /// <summary>Historique complet des abonnements user.</summary>
    [HttpGet("history")]
    public async Task<IActionResult> History()
    {
        var subs = await _service.GetHistoryAsync(GetCurrentUserId());
        return Ok(subs.Select(s => new
        {
            id = s.Id,
            tier = s.Tier.ToString(),
            status = s.Status.ToString(),
            period = s.Period.ToString(),
            provider = s.Provider.ToString(),
            amountMad = s.AmountMad,
            startedAt = s.StartedAt,
            expiresAt = s.ExpiresAt,
            cancelledAt = s.CancelledAt,
        }));
    }

    /// <summary>Tarifs Free/Premium/Elite (Monthly + Yearly).</summary>
    [HttpGet("/api/subscription/pricing")]
    [AllowAnonymous]
    public IActionResult Pricing()
    {
        return Ok(new
        {
            currency = "MAD",
            plans = new[]
            {
                new {
                    tier = "Free",
                    monthlyMad = 0m,
                    yearlyMad = 0m,
                    features = new[] { "5 messages coach IA/jour", "Generation programme limitee", "Acces de base" }
                },
                new {
                    tier = "Premium",
                    monthlyMad = _service.GetPriceMad(SubscriptionTier.Premium, RenewalPeriod.Monthly),
                    yearlyMad = _service.GetPriceMad(SubscriptionTier.Premium, RenewalPeriod.Yearly),
                    features = new[] { "Coach IA illimite", "Programmes IA illimites", "Coach Vision (20 exos)", "Scan repas illimite", "Sans publicite" }
                },
                new {
                    tier = "Elite",
                    monthlyMad = _service.GetPriceMad(SubscriptionTier.Elite, RenewalPeriod.Monthly),
                    yearlyMad = _service.GetPriceMad(SubscriptionTier.Elite, RenewalPeriod.Yearly),
                    features = new[] { "Tout Premium +", "Coach vocal (voix influenceur)", "Lives VIP", "Coaching 1-on-1", "Plan tournage personnalise" }
                },
            }
        });
    }

    /// <summary>Annule l'auto-renouvellement (accès garde jusqu'à ExpiresAt).</summary>
    [HttpPost("cancel")]
    public async Task<IActionResult> Cancel()
    {
        var sub = await _service.CancelAsync(GetCurrentUserId());
        if (sub == null) return NotFound(new { error = "No active subscription" });
        return Ok(new { cancelled = true, activeUntil = sub.ExpiresAt });
    }

    /// <summary>
    /// DEV ONLY — upgrade instant Premium/Elite sans paiement.
    /// À retirer en prod ou gater [Authorize(Roles="Admin")].
    /// </summary>
    [HttpPost("dev-upgrade")]
    public async Task<IActionResult> DevUpgrade([FromBody] DevUpgradeRequest req)
    {
        if (!Enum.TryParse<SubscriptionTier>(req.Tier, true, out var tier) || tier == SubscriptionTier.Free)
            return BadRequest(new { error = "Tier must be Premium or Elite" });
        if (!Enum.TryParse<RenewalPeriod>(req.Period ?? "Monthly", true, out var period))
            return BadRequest(new { error = "Period must be Monthly or Yearly" });

        var amount = _service.GetPriceMad(tier, period);
        var sub = await _service.CreateAsync(GetCurrentUserId(), tier, period, PaymentProvider.Manual, amount, externalId: "dev-upgrade");
        return Ok(new { id = sub.Id, tier = sub.Tier.ToString(), expiresAt = sub.ExpiresAt });
    }
}

public class DevUpgradeRequest
{
    public string Tier { get; set; } = "Premium";
    public string? Period { get; set; } = "Monthly";
}
