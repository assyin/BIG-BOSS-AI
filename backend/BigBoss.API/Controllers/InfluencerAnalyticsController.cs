using BigBoss.Core.Enums;
using BigBoss.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BigBoss.API.Controllers;

/// <summary>
/// Sprint 5.4 — Dashboard analytics influenceur (admin only).
/// Endpoint unique qui agrège DAU/MAU/croissance/conversion/revenus/top contenus.
/// </summary>
[ApiController]
[Route("api/admin/influencer-analytics")]
[Authorize(Roles = "Admin")]
public class InfluencerAnalyticsController : ControllerBase
{
    private readonly BigBossDbContext _db;
    private readonly ILogger<InfluencerAnalyticsController> _logger;

    public InfluencerAnalyticsController(BigBossDbContext db, ILogger<InfluencerAnalyticsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var now = DateTime.UtcNow;
        var dayStart = now.Date;
        var monthAgo = now.AddDays(-30);
        var thirtyDayAgoStart = now.AddDays(-60);

        // ─── KPIs principaux ─────────────────────────────────────
        var totalUsers = await _db.Users.AsNoTracking().CountAsync();

        // DAU = users actifs aujourd'hui (LastActivityDate >= dayStart)
        var dau = await _db.Users.AsNoTracking()
            .CountAsync(u => u.LastActivityDate >= dayStart);

        // MAU = users actifs ces 30 jours
        var mau = await _db.Users.AsNoTracking()
            .CountAsync(u => u.LastActivityDate >= monthAgo);

        var newUsersLast30 = await _db.Users.AsNoTracking()
            .CountAsync(u => u.CreatedAt >= monthAgo);

        var newUsersPrev30 = await _db.Users.AsNoTracking()
            .CountAsync(u => u.CreatedAt >= thirtyDayAgoStart && u.CreatedAt < monthAgo);

        var growthRate = newUsersPrev30 > 0
            ? Math.Round((decimal)(newUsersLast30 - newUsersPrev30) * 100 / newUsersPrev30, 1)
            : 0;

        // Conversion Free → Premium
        var premiumUsers = await _db.Users.AsNoTracking()
            .CountAsync(u => u.SubscriptionTier != SubscriptionTier.Free);
        var conversionRate = totalUsers > 0
            ? Math.Round((decimal)premiumUsers * 100 / totalUsers, 1)
            : 0;

        // ─── Revenus mensuels (via Payment Sprint 2 Phase A) ──
        decimal monthRevenue = 0;
        try
        {
            monthRevenue = await _db.Set<BigBoss.Core.Entities.Payment>().AsNoTracking()
                .Where(p => p.CreatedAt >= monthAgo && p.Status == BigBoss.Core.Enums.PaymentStatus.Succeeded)
                .SumAsync(p => p.AmountMad);
        }
        catch
        {
            // Payments table may not exist yet
        }

        // ─── Croissance 30 jours (courbe daily new users) ────────
        var growthCurve = await _db.Users.AsNoTracking()
            .Where(u => u.CreatedAt >= monthAgo)
            .GroupBy(u => u.CreatedAt.Date)
            .Select(g => new { Date = g.Key, Count = g.Count() })
            .OrderBy(p => p.Date)
            .ToListAsync();

        // ─── Top recettes (par favoris) ──────────────────────────
        var topRecipesRaw = await _db.UserFavoriteRecipes.AsNoTracking()
            .GroupBy(f => f.RecipeId)
            .Select(g => new { RecipeId = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(10)
            .ToListAsync();

        var topRecipeIds = topRecipesRaw.Select(r => r.RecipeId).ToList();
        var recipes = await _db.Recipes.AsNoTracking()
            .Where(r => topRecipeIds.Contains(r.Id))
            .Select(r => new { r.Id, Title = r.TitleFr ?? "Recipe" })
            .ToListAsync();
        var topRecipes = topRecipesRaw.Select(r => new
        {
            recipeId = r.RecipeId,
            title = recipes.FirstOrDefault(x => x.Id == r.RecipeId)?.Title ?? "Recipe",
            favoriteCount = r.Count,
        }).ToList();

        // ─── Top challenges (par participants si entité existe) ──
        object topChallenges = new List<object>();
        try
        {
            var ch = await _db.Set<BigBoss.Core.Entities.Challenge>().AsNoTracking()
                .Include(c => c.Participations)
                .Select(c => new { c.Id, c.Title, participants = c.Participations.Count })
                .OrderByDescending(c => c.participants)
                .Take(5)
                .ToListAsync();
            topChallenges = ch;
        }
        catch { /* table absente, ignore */ }

        // ─── Heatmap utilisateurs par ville (BuddyProfile.City + Users.City) ─
        var cityCountsBuddy = await _db.BuddyProfiles.AsNoTracking()
            .Where(p => !string.IsNullOrEmpty(p.City))
            .GroupBy(p => p.City)
            .Select(g => new { City = g.Key, Count = g.Count() })
            .ToListAsync();

        var cityCountsUsers = await _db.Users.AsNoTracking()
            .Where(u => u.City != null && u.City != "")
            .GroupBy(u => u.City!)
            .Select(g => new { City = g.Key!, Count = g.Count() })
            .ToListAsync();

        // Merger les deux par ville (case insensitive)
        var byCity = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var c in cityCountsBuddy)
        {
            if (string.IsNullOrEmpty(c.City)) continue;
            byCity[c.City] = byCity.GetValueOrDefault(c.City, 0) + c.Count;
        }
        foreach (var c in cityCountsUsers)
        {
            if (string.IsNullOrEmpty(c.City)) continue;
            byCity[c.City] = byCity.GetValueOrDefault(c.City, 0) + c.Count;
        }
        var heatmap = byCity.OrderByDescending(kv => kv.Value)
            .Take(10)
            .Select(kv => new { city = kv.Key, count = kv.Value })
            .ToList();

        // ─── Sessions stats ──────────────────────────────────────
        var sessionsLast30 = await _db.Sessions.AsNoTracking()
            .CountAsync(s => s.CompletedAt >= monthAgo);

        // ─── Lives stats ─────────────────────────────────────────
        int livesUpcoming = 0;
        int livesLast30 = 0;
        try
        {
            livesUpcoming = await _db.Lives.AsNoTracking()
                .CountAsync(l => l.ScheduledAt > now && l.StartedAt == null);
            livesLast30 = await _db.Lives.AsNoTracking()
                .CountAsync(l => l.StartedAt >= monthAgo);
        }
        catch { }

        return Ok(new
        {
            generatedAt = now,
            kpi = new
            {
                totalUsers,
                dau,
                mau,
                premiumUsers,
                conversionRate,           // %
                newUsersLast30,
                growthRate,               // % vs prev 30
                monthRevenue,             // MAD
                sessionsLast30,
                livesUpcoming,
                livesLast30,
            },
            growthCurve,
            topRecipes,
            topChallenges,
            cityHeatmap = heatmap,
        });
    }
}
