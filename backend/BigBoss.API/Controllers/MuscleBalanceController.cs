using BigBoss.Core.Enums;
using BigBoss.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace BigBoss.API.Controllers;

/// <summary>
/// Sprint 3.4 — Radar musculaire: répartition du volume par groupe musculaire
/// sur les 30 derniers jours, normalisé en ratios pour le chart radar mobile.
/// </summary>
[ApiController]
[Route("api/me/muscle-balance")]
[Authorize]
public class MuscleBalanceController : ControllerBase
{
    private readonly BigBossDbContext _context;

    public MuscleBalanceController(BigBossDbContext context)
    {
        _context = context;
    }

    private Guid GetCurrentUserId()
    {
        var id = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.Parse(id!);
    }

    /// <summary>
    /// Retourne le volume cumulé (sets × reps × weight) par groupe musculaire
    /// sur les N derniers jours (default 30), normalisé en ratios 0-1.5.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] int days = 30)
    {
        var userId = GetCurrentUserId();
        var since = DateTime.UtcNow.AddDays(-Math.Max(7, Math.Min(365, days)));

        // Récupérer SessionExercises completed dans la période
        var data = await _context.SessionExercises
            .AsNoTracking()
            .Include(se => se.Session)
            .Include(se => se.Exercise)
            .Where(se => se.Session.UserId == userId
                && se.IsCompleted
                && se.CompletedAt >= since
                && !se.IsSkipped)
            .Select(se => new
            {
                Muscle = se.Exercise.PrimaryMuscle,
                Volume = se.RepsCompleted.Sum() * (se.WeightsCompletedKg.Any() ? (double)se.WeightsCompletedKg.Average() : 1),
                Sets = se.SetsCompleted,
            })
            .ToListAsync();

        // Filtrer les groupes pertinents pour radar (exclude Mobility, Cardio si peu utilisé)
        var radarMuscles = new[]
        {
            MuscleGroup.Chest, MuscleGroup.Back, MuscleGroup.Shoulders,
            MuscleGroup.Biceps, MuscleGroup.Triceps,
            MuscleGroup.Quadriceps, MuscleGroup.Hamstrings, MuscleGroup.Glutes,
            MuscleGroup.Abs, MuscleGroup.Calves,
        };

        // Agréger par muscle
        var byMuscle = data
            .GroupBy(d => d.Muscle)
            .ToDictionary(g => g.Key, g => new
            {
                Volume = g.Sum(x => x.Volume),
                Sets = g.Sum(x => x.Sets),
            });

        // Normaliser: max volume / nombre de sets => ratio
        var maxSets = byMuscle.Values.Any() ? byMuscle.Values.Max(v => v.Sets) : 0;
        var maxVolume = byMuscle.Values.Any() ? byMuscle.Values.Max(v => v.Volume) : 0;

        var result = radarMuscles.Select(m =>
        {
            byMuscle.TryGetValue(m, out var stats);
            var volumeRatio = maxVolume > 0 ? Math.Round((stats?.Volume ?? 0) / maxVolume, 2) : 0;
            var setsRatio = maxSets > 0 ? Math.Round((double)(stats?.Sets ?? 0) / maxSets, 2) : 0;
            return new
            {
                muscle = m.ToString(),
                labelFr = FrLabel(m),
                volume = Math.Round(stats?.Volume ?? 0, 1),
                sets = stats?.Sets ?? 0,
                volumeRatio,
                setsRatio,
            };
        }).ToList();

        return Ok(new
        {
            days,
            since,
            totalSets = byMuscle.Values.Sum(v => v.Sets),
            totalVolume = Math.Round(byMuscle.Values.Sum(v => v.Volume), 1),
            muscles = result,
        });
    }

    private static string FrLabel(MuscleGroup m) => m switch
    {
        MuscleGroup.Chest => "Pectoraux",
        MuscleGroup.Back => "Dos",
        MuscleGroup.Quadriceps => "Quadri",
        MuscleGroup.Hamstrings => "Ischio",
        MuscleGroup.Glutes => "Fessiers",
        MuscleGroup.Calves => "Mollets",
        MuscleGroup.Shoulders => "Épaules",
        MuscleGroup.Biceps => "Biceps",
        MuscleGroup.Triceps => "Triceps",
        MuscleGroup.Abs => "Abs",
        _ => m.ToString(),
    };
}
