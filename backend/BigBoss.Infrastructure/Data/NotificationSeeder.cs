using BigBoss.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace BigBoss.Infrastructure.Data;

public static class NotificationSeeder
{
    public static async Task SeedAsync(BigBossDbContext context)
    {
        var existing = await context.NotificationTemplates
            .AsNoTracking()
            .Select(t => t.TriggerKey)
            .ToListAsync();

        var templates = new List<NotificationTemplate>
        {
            new()
            {
                TriggerKey = "achievement_unlocked",
                TitleFr = "Badge debloque!",
                TitleAr = "شارة جديدة!",
                BodyFr = "Bravo! Tu viens de debloquer: {name}",
                BodyAr = "مبروك! فكيت شارة جديدة: {name}",
            },
            new()
            {
                TriggerKey = "streak_risk",
                TitleFr = "Ne casse pas ta serie!",
                TitleAr = "ما تقطعش السلسلة!",
                BodyFr = "{days} jours de suite. Entraine-toi aujourd'hui pour garder ton streak!",
                BodyAr = "{days} يام متتاليين. درب اليوم باش تحافظ على السلسلة!",
            },
            new()
            {
                TriggerKey = "session_reminder",
                TitleFr = "Ta seance t'attend!",
                TitleAr = "الحصة كتسناك!",
                BodyFr = "{title} - {duration} min. Allez, الوحش!",
                BodyAr = "{title} - {duration} د. يالاه الوحش!",
            },
            new()
            {
                TriggerKey = "challenge_new",
                TitleFr = "Nouveau challenge!",
                TitleAr = "تحدي جديد!",
                BodyFr = "\"{title}\" vient d'etre lance. Rejoins maintenant!",
                BodyAr = "\"{title}\" تبدا دابا. شارك فيه دروك!",
            },
            new()
            {
                TriggerKey = "challenge_completed",
                TitleFr = "Challenge reussi!",
                TitleAr = "كملتي التحدي!",
                BodyFr = "Bravo! Tu as termine \"{title}\" et gagne {points} pts!",
                BodyAr = "مبروك! كملتي \"{title}\" وربحتي {points} نقطة!",
            },
            new()
            {
                TriggerKey = "live_starting",
                TitleFr = "Live bientot!",
                TitleAr = "اللايف قريب!",
                BodyFr = "\"{title}\" commence dans {minutes} minutes",
                BodyAr = "\"{title}\" يبدا فـ {minutes} د",
            },
            new()
            {
                TriggerKey = "reward_confirmed",
                TitleFr = "Recompense confirmee",
                TitleAr = "المكافأة مأكدة",
                BodyFr = "\"{title}\" - {code}. Verifie les instructions.",
                BodyAr = "\"{title}\" - {code}. شوف التفاصيل.",
            },
            new()
            {
                TriggerKey = "reward_shipped",
                TitleFr = "Colis expedie!",
                TitleAr = "الطرد تبعت!",
                BodyFr = "Ta recompense \"{title}\" est en route. Suivi: {tracking}",
                BodyAr = "المكافأة \"{title}\" فالطريق. تتبع: {tracking}",
            },
            new()
            {
                TriggerKey = "points_milestone",
                TitleFr = "Etape atteinte!",
                TitleAr = "هدف تحقق!",
                BodyFr = "Tu as atteint {points} pts! Continue comme ca!",
                BodyAr = "وصلتي لـ {points} نقطة! كمل هكا!",
            },
            new()
            {
                TriggerKey = "weekly_recap",
                TitleFr = "Bilan de la semaine",
                TitleAr = "حصيلة السيمانة",
                BodyFr = "{sessions} seances, {points} pts gagnes. Bravo!",
                BodyAr = "{sessions} حصة، {points} نقطة. مبروك!",
            },
        };

        var toAdd = templates.Where(t => !existing.Contains(t.TriggerKey)).ToList();
        if (toAdd.Count > 0)
        {
            context.NotificationTemplates.AddRange(toAdd);
            await context.SaveChangesAsync();
        }
    }
}
