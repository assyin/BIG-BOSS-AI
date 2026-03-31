using System.Net.Http.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace BigBoss.Infrastructure.Services;

public interface IElevenLabsService
{
    Task<byte[]> GenerateSpeechAsync(string text);
    Task<string> GenerateSpeechAndUploadAsync(string text, string fileName);
}

public class ElevenLabsService : IElevenLabsService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<ElevenLabsService> _logger;
    private readonly string _apiKey;
    private readonly string _voiceId;

    public ElevenLabsService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<ElevenLabsService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _apiKey = configuration["BBF_ELEVENLABS_API_KEY"] ?? "";
        _voiceId = configuration["BBF_ELEVENLABS_VOICE_ID"] ?? "";

        _httpClient.BaseAddress = new Uri("https://api.elevenlabs.io/");
        _httpClient.DefaultRequestHeaders.Add("xi-api-key", _apiKey);
    }

    public async Task<byte[]> GenerateSpeechAsync(string text)
    {
        if (string.IsNullOrEmpty(_apiKey) || string.IsNullOrEmpty(_voiceId))
        {
            _logger.LogWarning("ElevenLabs not configured, returning empty audio");
            return Array.Empty<byte>();
        }

        var payload = new
        {
            text,
            model_id = "eleven_multilingual_v2",
            voice_settings = new
            {
                stability = 0.5,
                similarity_boost = 0.8,
                style = 0.5,
                use_speaker_boost = true
            }
        };

        var response = await _httpClient.PostAsJsonAsync($"v1/text-to-speech/{_voiceId}", payload);

        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync();
            _logger.LogError("ElevenLabs API error: {StatusCode} - {Error}", response.StatusCode, error);
            throw new HttpRequestException($"ElevenLabs API error: {response.StatusCode}");
        }

        return await response.Content.ReadAsByteArrayAsync();
    }

    public async Task<string> GenerateSpeechAndUploadAsync(string text, string fileName)
    {
        var audioBytes = await GenerateSpeechAsync(text);

        if (audioBytes.Length == 0)
        {
            return "";
        }

        // TODO: Upload to Cloudflare R2 and return URL
        // For now, return empty
        _logger.LogInformation("Generated speech for: {Text}", text.Substring(0, Math.Min(50, text.Length)));

        return "";
    }
}
