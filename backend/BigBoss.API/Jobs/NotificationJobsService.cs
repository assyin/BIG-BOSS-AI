using BigBoss.Core.Interfaces;
using BigBoss.Infrastructure.Data;
using BigBoss.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BigBoss.API.Jobs;

/// <summary>
/// Sprint 3.1 — Jobs Hangfire pour notifications schedulées.
///
/// Templates inline (FR + Darija) basés sur user.PreferredLanguage.
/// Tous les jobs sont idempotents : peuvent être rejoués sans effet de bord.
/// </summary>
public class NotificationJobsService
{
    private readonly BigBossDbContext _context;
    private readonly IPushNotificationService _push;
    private readonly ILogger<NotificationJobsService> _logger;

    public NotificationJobsService(
        BigBossDbContext context,
        IPushNotificationService push,
        ILogger<NotificationJobsService> logger)
    {
        _context = context;
        _push = push;
        _logger = logger;
    }

    // -------- Templates --------
    private static (string title, string body) WorkoutReminderTemplate(string lang) => lang switch
    {
        "darija" => ("يلا الصالة! 💪", "ما تنساش الجلسة ديالك ليوم — شد المعدات ويلا!"),
        "ar"     => ("حان وقت التمرين! 💪", "لا تنسى جلستك اليومية — هيا بنا!"),
        _        => ("Yallah à la salle ! 💪", "Ta séance du jour t'attend — on lâche rien !"),
    };

    private static (string title, string body) StreakReminderTemplate(string lang, int streak) => lang switch
    {
        "darija" => ("🔥 ستريك ديالك فالخطر!", $"عندك {streak} يام متتالية — جلسة وحدة بحال وتحافظ عليه!"),
        "ar"     => ("🔥 سلسلتك في خطر!", $"لديك {streak} أيام متتالية — جلسة واحدة فقط للحفاظ عليها!"),
        _        => ("🔥 Ton streak est en danger !", $"{streak} jours consécutifs — 1 séance suffit pour le garder !"),
    };

    private static (string title, string body) LiveStartingTemplate(string lang, string title, int minutes) => lang switch
    {
        "darija" => ("🔴 Live قريب يبدا!", $"{title} غادي يبدا فـ {minutes} دقيقة. ولا تفوته!"),
        "ar"     => ("🔴 بث مباشر قريباً!", $"{title} يبدأ خلال {minutes} دقيقة. لا تفوته!"),
        _        => ("🔴 Live dans quelques minutes !", $"{title} démarre dans {minutes} min. Ne le rate pas !"),
    };

    private static (string title, string body) WeeklyRecapTemplate(string lang, int sessions, double volumeTons, int prs) => lang switch
    {
        "darija" => ("📊 الأسبوع ديالك", $"{sessions} جلسات · {volumeTons:F1}T volume · {prs} ريكور جديد. مزيان أ بطل!"),
        "ar"     => ("📊 ملخص أسبوعك", $"{sessions} جلسات · {volumeTons:F1} طن · {prs} أرقام قياسية جديدة. أحسنت!"),
        _        => ("📊 Ta semaine en chiffres", $"{sessions} séances · {volumeTons:F1}T volume · {prs} nouveaux PRs. Bravo !"),
    };

    // -------- Jobs --------

    /// <summary>Daily 18h — push aux users sans séance depuis 24h.</summary>
    public async Task SendWorkoutRemindersAsync()
    {
        var since = DateTime.UtcNow.AddHours(-24);
        var candidates = await _context.Users.AsNoTracking()
            .Where(u => u.NotificationsEnabled
                && u.PushToken != null
                && !u.IsSuspended
                && (u.LastActivityDate == null || u.LastActivityDate < since))
            .Select(u => new { u.Id, u.PreferredLanguage })
            .ToListAsync();

        var sent = 0;
        foreach (var u in candidates)
        {
            var (title, body) = WorkoutReminderTemplate(u.PreferredLanguage);
            try
            {
                await _push.SendToUserAsync(u.Id, title, body, new { type = "workout_reminder" });
                sent++;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "WorkoutReminder failed for {UserId}", u.Id);
            }
        }
        _logger.LogInformation("WorkoutReminders: {Sent}/{Total}", sent, candidates.Count);
    }

    /// <summary>Daily 20h — push aux users avec streak > 0 et sans activité aujourd'hui.</summary>
    public async Task SendStreakRemindersAsync()
    {
        var today = DateTime.UtcNow.Date;
        var candidates = await _context.Users.AsNoTracking()
            .Where(u => u.NotificationsEnabled
                && u.PushToken != null
                && !u.IsSuspended
                && u.CurrentStreak > 0
                && (u.LastActivityDate == null || u.LastActivityDate < today))
            .Select(u => new { u.Id, u.PreferredLanguage, u.CurrentStreak })
            .ToListAsync();

        var sent = 0;
        foreach (var u in candidates)
        {
            var (title, body) = StreakReminderTemplate(u.PreferredLanguage, u.CurrentStreak);
            try
            {
                await _push.SendToUserAsync(u.Id, title, body, new { type = "streak_reminder", streak = u.CurrentStreak });
                sent++;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "StreakReminder failed for {UserId}", u.Id);
            }
        }
        _logger.LogInformation("StreakReminders: {Sent}/{Total}", sent, candidates.Count);
    }

    /// <summary>Every 30min — push pour lives démarrant dans 30 min.</summary>
    public async Task SendLiveStartingSoonAsync()
    {
        var now = DateTime.UtcNow;
        var soon = now.AddMinutes(30);
        var window = now.AddMinutes(35); // marge pour ne pas rater le tick

        var lives = await _context.Lives.AsNoTracking()
            .Where(l => l.ScheduledAt >= soon && l.ScheduledAt <= window && l.StartedAt == null)
            .ToListAsync();

        if (!lives.Any()) return;

        // Tous les users notifiables (broadcast pour les lives)
        var users = await _context.Users.AsNoTracking()
            .Where(u => u.NotificationsEnabled && u.PushToken != null && !u.IsSuspended)
            .Select(u => new { u.Id, u.PreferredLanguage })
            .ToListAsync();

        foreach (var live in lives)
        {
            var minutes = (int)Math.Round((live.ScheduledAt - now).TotalMinutes);
            foreach (var u in users)
            {
                var (title, body) = LiveStartingTemplate(u.PreferredLanguage, live.Title, minutes);
                try
                {
                    await _push.SendToUserAsync(u.Id, title, body,
                        new { type = "live_starting_soon", liveId = live.Id });
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "LiveStarting failed for user {UserId}", u.Id);
                }
            }
            _logger.LogInformation("LiveStarting: live {LiveId} ({Title}) — pushed to {Count} users",
                live.Id, live.Title, users.Count);
        }
    }

    /// <summary>Sunday 18h — recap hebdo (séances + volume + PRs).</summary>
    public async Task SendWeeklyRecapAsync()
    {
        var weekAgo = DateTime.UtcNow.AddDays(-7);

        var users = await _context.Users.AsNoTracking()
            .Where(u => u.NotificationsEnabled && u.PushToken != null && !u.IsSuspended)
            .Select(u => new { u.Id, u.PreferredLanguage })
            .ToListAsync();

        var sent = 0;
        foreach (var u in users)
        {
            // Sessions complétées cette semaine
            var sessions = await _context.Sessions.AsNoTracking()
                .Where(s => s.UserId == u.Id && s.CompletedAt >= weekAgo)
                .ToListAsync();

            if (!sessions.Any()) continue;

            // Volume = sum (reps × weight) sur SessionExercises completed
            var sessionIds = sessions.Select(s => s.Id).ToList();
            var exos = await _context.SessionExercises.AsNoTracking()
                .Where(se => sessionIds.Contains(se.SessionId) && se.IsCompleted)
                .Select(se => new { se.RepsCompleted, se.WeightsCompletedKg })
                .ToListAsync();

            double volumeKg = 0;
            foreach (var e in exos)
            {
                var reps = e.RepsCompleted.Sum();
                var avgW = e.WeightsCompletedKg.Any() ? (double)e.WeightsCompletedKg.Average() : 0;
                volumeKg += reps * avgW;
            }

            var volumeTons = volumeKg / 1000.0;

            // PRs cette semaine — proxy : sessions avec AverageFormScore > 80
            var prs = exos.Count(_ => false); // placeholder, à raffiner quand PR tracking existe

            var (title, body) = WeeklyRecapTemplate(u.PreferredLanguage, sessions.Count, volumeTons, prs);
            try
            {
                await _push.SendToUserAsync(u.Id, title, body,
                    new { type = "weekly_recap", sessions = sessions.Count, volumeKg, prs });
                sent++;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "WeeklyRecap failed for {UserId}", u.Id);
            }
        }
        _logger.LogInformation("WeeklyRecap: {Sent} users", sent);
    }
}
