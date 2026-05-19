using System.Diagnostics;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using BigBoss.Core.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace BigBoss.Infrastructure.Services;

public class ClaudeService : IClaudeService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<ClaudeService> _logger;
    private readonly string _apiKey;
    private readonly string _modelFast;
    private readonly string _modelSmart;

    public ClaudeService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<ClaudeService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _apiKey = configuration["BBF_CLAUDE_API_KEY"] ?? throw new ArgumentNullException("Claude API key not configured");
        _modelFast = configuration["BBF_CLAUDE_MODEL_FAST"] ?? "claude-haiku-4-5-20251001";
        _modelSmart = configuration["BBF_CLAUDE_MODEL_SMART"] ?? "claude-sonnet-4-6";

        _httpClient.BaseAddress = new Uri("https://api.anthropic.com/");
        _httpClient.DefaultRequestHeaders.Add("x-api-key", _apiKey);
        _httpClient.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");
    }

    public async Task<ClaudeResponse> SendMessageAsync(ClaudeRequest request)
    {
        var stopwatch = Stopwatch.StartNew();

        var messages = new List<object>();

        // Add conversation history if present
        if (request.ConversationHistory != null)
        {
            foreach (var msg in request.ConversationHistory)
            {
                messages.Add(new { role = msg.Role, content = msg.Content });
            }
        }

        // Add current user message
        messages.Add(new { role = "user", content = request.UserMessage });

        var payload = new
        {
            model = request.Model,
            max_tokens = request.MaxTokens,
            system = request.SystemPrompt,
            messages
        };

        var response = await _httpClient.PostAsJsonAsync("v1/messages", payload);
        var responseContent = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Claude API error: {StatusCode} - {Content}", response.StatusCode, responseContent);
            throw new HttpRequestException($"Claude API error: {response.StatusCode}");
        }

        var result = JsonDocument.Parse(responseContent);
        var content = result.RootElement
            .GetProperty("content")[0]
            .GetProperty("text")
            .GetString() ?? "";

        var inputTokens = result.RootElement.GetProperty("usage").GetProperty("input_tokens").GetInt32();
        var outputTokens = result.RootElement.GetProperty("usage").GetProperty("output_tokens").GetInt32();

        stopwatch.Stop();

        _logger.LogInformation(
            "Claude request completed: Model={Model}, InputTokens={InputTokens}, OutputTokens={OutputTokens}, LatencyMs={LatencyMs}",
            request.Model, inputTokens, outputTokens, stopwatch.ElapsedMilliseconds);

        return new ClaudeResponse(
            Content: content,
            InputTokens: inputTokens,
            OutputTokens: outputTokens,
            Model: request.Model,
            LatencyMs: (int)stopwatch.ElapsedMilliseconds
        );
    }

    public async Task<ClaudeResponse> SendMessageWithImageAsync(ClaudeRequest request, string imageBase64)
    {
        var stopwatch = Stopwatch.StartNew();

        // Determine media type
        var mediaType = "image/jpeg";
        if (imageBase64.StartsWith("data:"))
        {
            var parts = imageBase64.Split(',');
            mediaType = parts[0].Replace("data:", "").Replace(";base64", "");
            imageBase64 = parts[1];
        }

        var messages = new List<object>
        {
            new
            {
                role = "user",
                content = new object[]
                {
                    new
                    {
                        type = "image",
                        source = new
                        {
                            type = "base64",
                            media_type = mediaType,
                            data = imageBase64
                        }
                    },
                    new
                    {
                        type = "text",
                        text = request.UserMessage
                    }
                }
            }
        };

        var payload = new
        {
            model = request.Model,
            max_tokens = request.MaxTokens,
            system = request.SystemPrompt,
            messages
        };

        var response = await _httpClient.PostAsJsonAsync("v1/messages", payload);
        var responseContent = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Claude Vision API error: {StatusCode} - {Content}", response.StatusCode, responseContent);
            throw new HttpRequestException($"Claude API error: {response.StatusCode}");
        }

        var result = JsonDocument.Parse(responseContent);
        var content = result.RootElement
            .GetProperty("content")[0]
            .GetProperty("text")
            .GetString() ?? "";

        var inputTokens = result.RootElement.GetProperty("usage").GetProperty("input_tokens").GetInt32();
        var outputTokens = result.RootElement.GetProperty("usage").GetProperty("output_tokens").GetInt32();

        stopwatch.Stop();

        return new ClaudeResponse(
            Content: content,
            InputTokens: inputTokens,
            OutputTokens: outputTokens,
            Model: request.Model,
            LatencyMs: (int)stopwatch.ElapsedMilliseconds
        );
    }

    public async Task<string> GenerateSessionPromptAsync(SessionGenerationContext context)
    {
        var systemPrompt = @"Tu es Big Boss, un coach fitness marocain legendaire. Tu generes des seances d'entrainement personnalisees.
Reponds UNIQUEMENT en JSON valide avec cette structure:
{
  ""title"": ""string"",
  ""description"": ""string"",
  ""warmup"": [{""name"": ""string"", ""duration_seconds"": number}],
  ""exercises"": [{
    ""name"": ""string"",
    ""sets"": number,
    ""reps"": number,
    ""weight_percent_1rm"": number,
    ""rest_seconds"": number,
    ""coaching_cues"": [""string""]
  }],
  ""cooldown"": [{""name"": ""string"", ""duration_seconds"": number}],
  ""motivation_message"": ""string""
}";

        var userMessage = $@"Genere une seance pour:
- Objectif: {context.UserGoal}
- Niveau: {context.UserLevel}
- Poids: {context.UserWeightKg}kg
- Equipement disponible: {string.Join(", ", context.AvailableEquipment)}
- Muscles travailles recemment: {string.Join(", ", context.RecentMuscleGroups)}
- Duree souhaitee: {context.DurationMinutes} minutes
- Niveau d'energie: {context.EnergyLevel ?? 7}/10
- Sommeil: {context.SleepHours ?? 7}h";

        var response = await SendMessageAsync(new ClaudeRequest(
            SystemPrompt: systemPrompt,
            UserMessage: userMessage,
            Model: _modelFast,
            MaxTokens: 2000
        ));

        return response.Content;
    }

    public async Task<string> AnalyzeMealImageAsync(string imageBase64)
    {
        var systemPrompt = @"Tu es un nutritionniste expert specialise dans la cuisine marocaine et mediterraneenne.
Analyse cette image de repas et reponds UNIQUEMENT en JSON valide:
{
  ""items"": [{
    ""name"": ""string"",
    ""name_ar"": ""string"",
    ""estimated_quantity_g"": number,
    ""calories"": number,
    ""proteins_g"": number,
    ""carbs_g"": number,
    ""fats_g"": number,
    ""confidence"": number
  }],
  ""total_calories"": number,
  ""total_proteins_g"": number,
  ""total_carbs_g"": number,
  ""total_fats_g"": number,
  ""analysis"": ""string"",
  ""confidence_score"": number
}";

        var response = await SendMessageWithImageAsync(
            new ClaudeRequest(
                SystemPrompt: systemPrompt,
                UserMessage: "Analyse ce repas et estime les macronutriments. Sois precis sur les quantites.",
                Model: _modelSmart, // Use smarter model for vision
                MaxTokens: 1500
            ),
            imageBase64
        );

        return response.Content;
    }

    public async Task<string> AnalyzeProgressPhotoAsync(string imageBase64, ProgressPhotoAnalysisContext context)
    {
        var systemPrompt = @"Tu es un coach fitness et nutritionniste expert.
Analyse cette photo de progression corporelle et reponds UNIQUEMENT en JSON valide (pas de markdown, pas de texte avant ou apres):
{
  ""bodyFatEstimate"": number,              // % estimé (entier ou décimal)
  ""bodyFatRange"": ""string"",             // ex: ""14-17%""
  ""postureScore"": number,                 // 1-10
  ""muscleMassScore"": number,              // 1-10
  ""muscleDistribution"": {
    ""chest"": ""string"",                  // ""underdeveloped"" | ""average"" | ""developed"" | ""well-developed""
    ""back"": ""string"",
    ""arms"": ""string"",
    ""shoulders"": ""string"",
    ""core"": ""string"",
    ""legs"": ""string""
  },
  ""strengths"": [""string""],              // 2-4 points forts visibles
  ""areasToImprove"": [""string""],         // 2-4 zones à travailler
  ""recommendation"": ""string"",           // 1-2 phrases en français : exercices + plan
  ""confidenceScore"": number,              // 0-1 (qualité photo + pose)
  ""disclaimer"": ""string""                // rappel: estimation visuelle, pas mesure clinique
}

Reste honnête et bienveillant. Ne fais pas de diagnostic médical. Si la photo n'est pas claire (pose non visible, vêtements amples, mauvaise lumière), baisse confidenceScore.";

        var userContext = $@"Profil utilisateur:
- Genre: {context.Gender ?? "non précisé"}
- Poids: {(context.WeightKg.HasValue ? $"{context.WeightKg} kg" : "non précisé")}
- Taille: {(context.HeightCm.HasValue ? $"{context.HeightCm} cm" : "non précisé")}
- Body fat précédemment renseigné: {(context.BodyFatPercent.HasValue ? $"{context.BodyFatPercent}%" : "inconnu")}
- Objectif: {context.Goal ?? "non précisé"}
- Pose photo: {context.PoseType}

Analyse cette photo et estime composition corporelle + recommandation focus.";

        var response = await SendMessageWithImageAsync(
            new ClaudeRequest(
                SystemPrompt: systemPrompt,
                UserMessage: userContext,
                Model: _modelSmart, // Sonnet pour vision (meilleure qualité analyse)
                MaxTokens: 1500
            ),
            imageBase64
        );

        return response.Content;
    }

    public async Task<string> GenerateMotivationalMessageAsync(MotivationContext context)
    {
        var systemPrompt = @"Tu es Big Boss, coach fitness marocain charismatique et motivant.
Ton style: direct, energique, utilise des expressions en Darija/Francais.
Genere un court message de motivation personnalise (2-3 phrases max).";

        var userMessage = $@"Genere un message pour {context.UserName}:
- Sessions totales: {context.TotalSessions}
- Streak actuel: {context.CurrentStreak} jours
- Volume aujourd'hui: {context.TodayVolumeKg}kg
- Nouveaux records: {string.Join(", ", context.NewPersonalRecords ?? new List<string>())}";

        var response = await SendMessageAsync(new ClaudeRequest(
            SystemPrompt: systemPrompt,
            UserMessage: userMessage,
            Model: _modelFast,
            MaxTokens: 200
        ));

        return response.Content;
    }
}
