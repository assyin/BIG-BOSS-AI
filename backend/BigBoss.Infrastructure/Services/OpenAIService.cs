using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace BigBoss.Infrastructure.Services;

public class OpenAIService
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private readonly ILogger<OpenAIService> _logger;

    public OpenAIService(HttpClient httpClient, IConfiguration config, ILogger<OpenAIService> logger)
    {
        _httpClient = httpClient;
        _apiKey = config["BBF_OPENAI_API_KEY"] ?? "";
        _logger = logger;
    }

    public bool IsConfigured => !string.IsNullOrEmpty(_apiKey) && _apiKey != "test-key";

    public async Task<string> GenerateSessionAsync(
        string userGoal, string userLevel, decimal? weightKg,
        string muscleGroup, int durationMinutes, int? energyLevel,
        List<string> recentMuscles, List<string> availableExercises)
    {
        var exerciseList = string.Join("\n", availableExercises.Select((e, i) => $"{i + 1}. {e}"));

        var prompt = $@"Tu es un coach fitness expert. Genere une seance d'entrainement personnalisee.

PROFIL UTILISATEUR:
- Objectif: {userGoal}
- Niveau: {userLevel}
- Poids: {weightKg?.ToString("F1") ?? "non renseigne"} kg
- Energie aujourd'hui: {energyLevel ?? 5}/10
- Muscles travailles recemment: {(recentMuscles.Any() ? string.Join(", ", recentMuscles) : "aucun")}

SEANCE DEMANDEE:
- Muscle cible: {muscleGroup}
- Duree: {durationMinutes} minutes

EXERCICES DISPONIBLES (choisis parmi ceux-ci UNIQUEMENT):
{exerciseList}

INSTRUCTIONS:
1. Choisis 4-8 exercices adaptes au niveau et a l'objectif
2. Varie les exercices (composes + isolation)
3. Adapte les sets/reps selon l'objectif:
   - Force: 4-5 sets x 3-6 reps, repos 180s
   - Masse: 3-4 sets x 8-12 reps, repos 90s
   - Seche: 3-4 sets x 12-20 reps, repos 60s
   - Endurance: 2-3 sets x 15-25 reps, repos 45s
4. Suggere un poids de depart si possible
5. Evite les muscles travailles recemment

Reponds UNIQUEMENT en JSON valide, sans markdown:
{{
  ""title"": ""Titre motivant de la seance"",
  ""description"": ""Description courte"",
  ""exercises"": [
    {{
      ""name"": ""Nom exact de l'exercice (depuis la liste)"",
      ""sets"": 4,
      ""reps"": 10,
      ""weight_kg"": null,
      ""rest_seconds"": 90,
      ""notes"": ""Conseil specifique""
    }}
  ],
  ""ai_summary"": ""Conseil motivant pour cette seance"",
  ""recommendations"": [""Conseil 1"", ""Conseil 2""]
}}";

        var requestBody = new
        {
            model = "gpt-4o-mini",
            messages = new[]
            {
                new { role = "system", content = "Tu es Big Boss, coach fitness marocain. Reponds toujours en francais avec un style motivant. Reponds UNIQUEMENT en JSON valide." },
                new { role = "user", content = prompt }
            },
            temperature = 0.7,
            max_tokens = 2000
        };

        var json = JsonSerializer.Serialize(requestBody);
        var request = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/chat/completions");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);
        request.Content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await _httpClient.SendAsync(request);
        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("OpenAI API error: {Status} {Body}", response.StatusCode, responseBody);
            throw new HttpRequestException($"OpenAI API error: {response.StatusCode}");
        }

        var doc = JsonDocument.Parse(responseBody);
        var content = doc.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString() ?? "{}";

        // Clean markdown if present
        content = content.Trim();
        if (content.StartsWith("```"))
        {
            content = content.Split('\n', 2).Length > 1 ? content.Split('\n', 2)[1] : content;
            if (content.EndsWith("```"))
                content = content[..^3];
            content = content.Trim();
        }

        _logger.LogInformation("OpenAI session generated successfully");
        return content;
    }

    public async Task<string> SendCoachMessageAsync(string userMessage, string userContext, List<(string role, string content)> history)
    {
        var messages = new List<object>
        {
            new { role = "system", content = $@"You are Big Boss, a Moroccan fitness coach AI. You communicate EXACTLY like the real Big Boss influencer.

LANGUAGE: 100% Darija (Moroccan Arabic). NEVER use MSA (formal Arabic) or French unless the user writes in French.

STYLE:
- Call followers ""الوحش"" (the beast/monster) — this is your signature word
- Motivating, casual, humorous, high-energy
- Use ""tu"" form (informal), like talking to a gym buddy
- Short punchy sentences, not long paragraphs

MANDATORY EXPRESSIONS (use frequently):
- الوحش (follower nickname)
- دير (do/make)
- مزيان (good/great)
- سير (go!)
- يالاه (let's go!)
- ها هي (here it is)
- نرجع (let's go back to)
- بغيت (I want)
- خويا (brother)
- تمرينة (workout session)
- بروتين (protein)

TOPICS YOU EXCEL AT:
- Workout routines and exercise form
- Nutrition (budget-friendly, Moroccan ingredients, halal)
- Motivation and mindset
- Ramadan training and nutrition
- Supplements guidance
- Home workouts

RESPONSE STYLE:
- Always encourage and motivate
- Give practical, actionable advice
- Use emojis sparingly (💪🔥 max)
- Keep responses under 150 words
- End with an encouraging phrase

AVOID:
- Formal Arabic (MSA)
- Medical diagnoses
- Complex scientific jargon
- Being negative or discouraging

USER CONTEXT:
{userContext}

Remember: You ARE Big Boss. Speak like him. الوحش!" }
        };

        foreach (var (role, content) in history.TakeLast(10))
        {
            messages.Add(new { role, content });
        }
        messages.Add(new { role = "user", content = userMessage });

        var requestBody = new
        {
            model = "gpt-4o-mini",
            messages,
            temperature = 0.8,
            max_tokens = 500
        };

        var json = JsonSerializer.Serialize(requestBody);
        var request = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/chat/completions");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);
        request.Content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await _httpClient.SendAsync(request);
        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException($"OpenAI API error: {response.StatusCode}");
        }

        var doc = JsonDocument.Parse(responseBody);
        return doc.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString() ?? "Desole, je n'ai pas pu generer de reponse.";
    }
}
