using BigBoss.Core.Entities;
using BigBoss.Core.Interfaces;
using BigBoss.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace BigBoss.API.Jobs;

/// <summary>
/// Nightly reconciliation of points balances
/// Runs every day at 3:00 AM UTC
/// </summary>
public class PointsReconciliationJob : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<PointsReconciliationJob> _logger;

    public PointsReconciliationJob(IServiceProvider services, ILogger<PointsReconciliationJob> logger)
    {
        _services = services;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            // Wait until 3 AM UTC
            var now = DateTime.UtcNow;
            var next3am = now.Date.AddDays(now.Hour >= 3 ? 1 : 0).AddHours(3);
            var delay = next3am - now;
            await Task.Delay(delay, stoppingToken);

            try
            {
                using var scope = _services.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<BigBossDbContext>();
                var logger = scope.ServiceProvider.GetRequiredService<ILogger<PointsReconciliationJob>>();

                logger.LogInformation("Starting nightly points reconciliation...");

                var users = await context.Users.Where(u => u.TotalPointsEarned > 0).ToListAsync(stoppingToken);
                int mismatches = 0;

                foreach (var user in users)
                {
                    var actualBalance = await context.PointTransactions
                        .Where(t => t.UserId == user.Id)
                        .SumAsync(t => t.Amount, stoppingToken);

                    if (user.PointsBalance != actualBalance)
                    {
                        logger.LogWarning("Balance mismatch: user {UserId} cached={Cached} actual={Actual}",
                            user.Id, user.PointsBalance, actualBalance);
                        user.PointsBalance = actualBalance;
                        mismatches++;
                    }
                }

                if (mismatches > 0)
                    await context.SaveChangesAsync(stoppingToken);

                logger.LogInformation("Points reconciliation complete: {Users} users checked, {Mismatches} mismatches fixed",
                    users.Count, mismatches);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Points reconciliation job failed");
            }
        }
    }
}

/// <summary>
/// Challenge finalization job
/// Runs every hour to check and finalize ended challenges
/// </summary>
public class ChallengeFinalizationJob : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<ChallengeFinalizationJob> _logger;

    public ChallengeFinalizationJob(IServiceProvider services, ILogger<ChallengeFinalizationJob> logger)
    {
        _services = services;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(TimeSpan.FromHours(1), stoppingToken);

            try
            {
                using var scope = _services.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<BigBossDbContext>();
                var challengeService = scope.ServiceProvider.GetRequiredService<IChallengeParticipationService>();

                var endedChallenges = await context.Challenges
                    .Where(c => c.IsActive && !c.IsFinalized && c.EndDate < DateTime.UtcNow.AddHours(-1))
                    .ToListAsync(stoppingToken);

                foreach (var challenge in endedChallenges)
                {
                    _logger.LogInformation("Auto-finalizing challenge {ChallengeId}: {Title}", challenge.Id, challenge.Title);
                    await challengeService.FinalizeChallengeAsync(challenge.Id);
                }

                if (endedChallenges.Count > 0)
                    _logger.LogInformation("Finalized {Count} challenges", endedChallenges.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Challenge finalization job failed");
            }
        }
    }
}

/// <summary>
/// CSV export service for admin
/// Generates exports in background and stores the file path
/// </summary>
public static class CsvExportService
{
    public static async Task<string> ExportChallengeParticipantsAsync(BigBossDbContext context, Guid challengeId)
    {
        var participations = await context.ChallengeParticipations
            .AsNoTracking()
            .Include(p => p.User)
            .Include(p => p.Challenge)
            .Where(p => p.ChallengeId == challengeId)
            .OrderByDescending(p => p.CurrentProgress)
            .ToListAsync();

        var csv = "Rang,Nom,Email,Progression,Complete,Points,Disqualifie\n";
        for (int i = 0; i < participations.Count; i++)
        {
            var p = participations[i];
            csv += $"{i + 1},{p.User?.Name},{p.User?.Email},{p.CurrentProgress},{p.IsCompleted},{p.PointsAwarded},{p.IsDisqualified}\n";
        }

        var filePath = Path.Combine(Path.GetTempPath(), $"challenge_{challengeId}_{DateTime.UtcNow:yyyyMMddHHmmss}.csv");
        await File.WriteAllTextAsync(filePath, csv);
        return filePath;
    }

    public static async Task<string> ExportPointsTransactionsAsync(BigBossDbContext context, Guid? userId = null)
    {
        var query = context.PointTransactions.AsNoTracking().Include(t => t.User).AsQueryable();
        if (userId.HasValue) query = query.Where(t => t.UserId == userId.Value);

        var transactions = await query.OrderByDescending(t => t.CreatedAt).Take(10000).ToListAsync();

        var csv = "Date,Utilisateur,Type,Montant,Raison,Solde Apres\n";
        foreach (var t in transactions)
        {
            csv += $"{t.CreatedAt:yyyy-MM-dd HH:mm},{t.User?.Name},{t.Type},{t.Amount},{t.Reason.Replace(",", " ")},{t.BalanceAfter}\n";
        }

        var filePath = Path.Combine(Path.GetTempPath(), $"points_{DateTime.UtcNow:yyyyMMddHHmmss}.csv");
        await File.WriteAllTextAsync(filePath, csv);
        return filePath;
    }
}
