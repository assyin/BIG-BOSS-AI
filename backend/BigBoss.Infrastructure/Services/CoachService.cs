using BigBoss.Core.DTOs.Coach;
using BigBoss.Core.Entities;
using BigBoss.Core.Enums;
using BigBoss.Core.Interfaces;
using BigBoss.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BigBoss.Infrastructure.Services;

public class CoachService : ICoachService
{
    private readonly BigBossDbContext _context;
    private readonly IClaudeService _claudeService;
    private readonly OpenAIService _openAIService;
    private readonly IUserService _userService;
    private readonly IElevenLabsService _elevenLabsService;
    private readonly ILogger<CoachService> _logger;

    // Basic responses for Free users when AI is unavailable
    private static readonly Dictionary<string, string[]> FREE_RESPONSES = new()
    {
        { "motivation", new[] {
            "Yallah khouya! Chaque rep te rapproche de ton objectif. Ne lache rien! 💪",
            "La regularite c'est la cle. Continue comme ca et les resultats viendront!",
            "Les jours ou tu n'as pas envie sont les plus importants. Vas-y!",
        }},
        { "nutrition", new[] {
            "Pour la prise de masse: 2g de proteines par kg de poids, repartis sur 4-5 repas. Poulet, oeufs, lentilles sont tes amis!",
            "En seche, reduis les glucides de 20%, garde les proteines hautes et bois minimum 3L d'eau par jour.",
            "Le timing nutritionnel: mange des glucides avant l'entrainement et des proteines apres. Simple et efficace!",
        }},
        { "entrainement", new[] {
            "Pour progresser: augmente le poids de 2.5kg quand tu fais toutes tes reps proprement 2 seances d'affilee.",
            "Le repos c'est la ou le muscle grandit. 48h minimum entre deux seances du meme muscle.",
            "Focus sur la forme avant la charge. Une rep propre vaut mieux que 5 reps avec de l'elan!",
        }},
        { "default", new[] {
            "Bonne question! Pour des conseils personnalises et un coaching IA complet, passe a Premium. En attendant, concentre-toi sur la regularite et la bonne forme!",
            "Safi khouya! Continue a t'entrainer regulierement et les resultats suivront. Pour un coaching IA personnalise, decouvre notre offre Premium!",
            "Excellente question! Mon conseil: reste constant, mange bien, dors bien. Pour aller plus loin avec l'IA, passe Premium!",
        }},
    };

    public CoachService(
        BigBossDbContext context,
        IClaudeService claudeService,
        OpenAIService openAIService,
        IUserService userService,
        IElevenLabsService elevenLabsService,
        ILogger<CoachService> logger)
    {
        _context = context;
        _claudeService = claudeService;
        _openAIService = openAIService;
        _userService = userService;
        _elevenLabsService = elevenLabsService;
        _logger = logger;
    }

    public async Task<CoachMessageResponse> SendMessageAsync(Guid userId, CoachMessageRequest request)
    {
        if (!await CanSendMessageAsync(userId))
        {
            throw new InvalidOperationException("Limite de messages atteinte pour aujourd'hui. Passe a Premium pour des messages illimites!");
        }

        var user = await _userService.GetByIdAsync(userId);
        if (user == null) throw new KeyNotFoundException("Utilisateur non trouve");

        // Save user message
        var userMessage = new CoachMessage
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Role = "user",
            Content = request.Message,
            CreatedAt = DateTime.UtcNow
        };
        _context.CoachMessages.Add(userMessage);

        string aiContent;
        string modelUsed;
        int tokensUsed = 0;
        int latencyMs = 0;

        var isPremium = user.SubscriptionTier != SubscriptionTier.Free;

        // Premium/Elite: OpenAI GPT-4o-mini
        if (isPremium && _openAIService.IsConfigured)
        {
            try
            {
                var sw = System.Diagnostics.Stopwatch.StartNew();

                var userContext = $"Nom: {user.Name}, Objectif: {user.Goal}, Niveau: {user.Level}, Poids: {user.WeightKg}kg, Abonnement: {user.SubscriptionTier}";

                // Get conversation history
                var history = await _context.CoachMessages
                    .Where(m => m.UserId == userId)
                    .OrderByDescending(m => m.CreatedAt)
                    .Take(10)
                    .ToListAsync();

                var historyTuples = history
                    .OrderBy(m => m.CreatedAt)
                    .Select(m => (m.Role, m.Content))
                    .ToList();

                aiContent = await _openAIService.SendCoachMessageAsync(
                    request.Message, userContext, historyTuples);

                sw.Stop();
                modelUsed = "gpt-4o-mini";
                latencyMs = (int)sw.ElapsedMilliseconds;
                _logger.LogInformation("OpenAI coach response for premium user {UserId} in {Ms}ms", userId, latencyMs);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "OpenAI coach failed for user {UserId}, using fallback", userId);
                aiContent = GetFreeResponse(request.Message);
                modelUsed = "fallback";
            }
        }
        else
        {
            // Free users: smart basic responses
            aiContent = GetFreeResponse(request.Message);
            modelUsed = "free-basic";
        }

        // Save assistant message
        var assistantMessage = new CoachMessage
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Role = "assistant",
            Content = aiContent,
            TokensUsed = tokensUsed,
            ModelUsed = modelUsed,
            LatencyMs = latencyMs,
            CreatedAt = DateTime.UtcNow
        };
        _context.CoachMessages.Add(assistantMessage);
        await _context.SaveChangesAsync();

        var quota = await GetQuotaAsync(userId);

        // Generate audio with ElevenLabs (Premium users only)
        string? audioUrl = null;
        if (_elevenLabsService.IsConfigured && user.SubscriptionTier != BigBoss.Core.Enums.SubscriptionTier.Free)
        {
            try
            {
                audioUrl = await _elevenLabsService.GenerateSpeechUrlAsync(aiContent);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to generate audio for coach message");
            }
        }

        return new CoachMessageResponse(
            Message: aiContent,
            AudioUrl: audioUrl,
            Metadata: new CoachMessageMetadata(
                ModelUsed: modelUsed,
                TokensUsed: tokensUsed,
                LatencyMs: latencyMs,
                DetectedIntent: null,
                SuggestedActions: null
            )
        );
    }

    private string GetFreeResponse(string userMessage)
    {
        var msg = userMessage.ToLower();

        string category;
        if (msg.Contains("motiv") || msg.Contains("envie") || msg.Contains("fatigue") || msg.Contains("abandon"))
            category = "motivation";
        else if (msg.Contains("manger") || msg.Contains("nutri") || msg.Contains("proteine") || msg.Contains("repas") || msg.Contains("calorie") || msg.Contains("regime"))
            category = "nutrition";
        else if (msg.Contains("exercice") || msg.Contains("seance") || msg.Contains("poids") || msg.Contains("muscle") || msg.Contains("rep") || msg.Contains("set") || msg.Contains("repos"))
            category = "entrainement";
        else
            category = "default";

        var responses = FREE_RESPONSES[category];
        var random = new Random();
        return responses[random.Next(responses.Length)];
    }

    public async Task<ConversationHistoryDto> GetConversationHistoryAsync(Guid userId, int page = 1, int pageSize = 20)
    {
        var totalCount = await _context.CoachMessages
            .CountAsync(m => m.UserId == userId);

        var messages = await _context.CoachMessages
            .AsNoTracking()
            .Where(m => m.UserId == userId)
            .OrderByDescending(m => m.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(m => new ConversationMessageDto(
                m.Id, m.Role, m.Content, m.ImageUrl, m.AudioUrl, m.CreatedAt
            ))
            .ToListAsync();

        return new ConversationHistoryDto(
            Messages: messages.OrderBy(m => m.CreatedAt).ToList(),
            TotalMessages: totalCount,
            HasMore: totalCount > page * pageSize
        );
    }

    public async Task<int> GetDailyMessageCountAsync(Guid userId)
    {
        return await _context.CoachMessages
            .CountAsync(m => m.UserId == userId &&
                             m.Role == "user" &&
                             m.CreatedAt.Date == DateTime.UtcNow.Date);
    }

    public async Task<bool> CanSendMessageAsync(Guid userId)
    {
        var user = await _userService.GetByIdAsync(userId);
        if (user == null) return false;

        var dailyLimit = user.SubscriptionTier switch
        {
            SubscriptionTier.Free => 5,
            SubscriptionTier.Premium => 50,
            SubscriptionTier.Elite => int.MaxValue,
            _ => 5
        };

        var todayCount = await GetDailyMessageCountAsync(userId);
        return todayCount < dailyLimit;
    }

    private async Task<(int used, int limit, int remaining)> GetQuotaAsync(Guid userId)
    {
        var user = await _userService.GetByIdAsync(userId);
        var dailyLimit = user?.SubscriptionTier switch
        {
            SubscriptionTier.Free => 5,
            SubscriptionTier.Premium => 50,
            SubscriptionTier.Elite => 999,
            _ => 5
        };
        var used = await GetDailyMessageCountAsync(userId);
        return (used, dailyLimit, Math.Max(0, dailyLimit - used));
    }

    public async Task ClearConversationHistoryAsync(Guid userId)
    {
        var messages = await _context.CoachMessages
            .Where(m => m.UserId == userId)
            .ToListAsync();

        _context.CoachMessages.RemoveRange(messages);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Conversation history cleared for user {UserId}", userId);
    }
}
