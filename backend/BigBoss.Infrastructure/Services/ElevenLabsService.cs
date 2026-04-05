using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace BigBoss.Infrastructure.Services;

public interface IElevenLabsService
{
    Task<byte[]> GenerateSpeechAsync(string text);
    Task<string> GenerateSpeechUrlAsync(string text);
    bool IsConfigured { get; }
}

public class ElevenLabsService : IElevenLabsService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<ElevenLabsService> _logger;
    private readonly string _apiKey;
    private readonly string _voiceId;
    private readonly string _audioDir;

    public bool IsConfigured => !string.IsNullOrEmpty(_apiKey) && !string.IsNullOrEmpty(_voiceId);

    public ElevenLabsService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<ElevenLabsService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _apiKey = configuration["BBF_ELEVENLABS_API_KEY"] ?? "";
        _voiceId = configuration["BBF_ELEVENLABS_VOICE_ID"] ?? "";

        // Store audio files locally
        var projectRoot = Directory.GetCurrentDirectory();
        _audioDir = Path.Combine(Directory.GetParent(projectRoot)?.FullName ?? projectRoot, "audio-cache");
        Directory.CreateDirectory(_audioDir);

        if (!string.IsNullOrEmpty(_apiKey))
        {
            _httpClient.BaseAddress = new Uri("https://api.elevenlabs.io/");
            _httpClient.DefaultRequestHeaders.TryAddWithoutValidation("xi-api-key", _apiKey);
        }
    }

    public async Task<byte[]> GenerateSpeechAsync(string text)
    {
        if (!IsConfigured)
        {
            _logger.LogWarning("ElevenLabs not configured");
            return Array.Empty<byte>();
        }

        var payload = new
        {
            text,
            model_id = "eleven_multilingual_v2",
            voice_settings = new
            {
                stability = 0.5,
                similarity_boost = 0.85,
                style = 0.4,
                use_speaker_boost = true
            }
        };

        var response = await _httpClient.PostAsJsonAsync($"v1/text-to-speech/{_voiceId}", payload);

        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync();
            _logger.LogError("ElevenLabs error: {StatusCode} - {Error}", response.StatusCode, error);
            return Array.Empty<byte>();
        }

        return await response.Content.ReadAsByteArrayAsync();
    }

    /// <summary>
    /// Generate speech and return a local URL. Uses cache based on text hash.
    /// </summary>
    public async Task<string> GenerateSpeechUrlAsync(string text)
    {
        if (!IsConfigured) return "";

        // Check cache
        var hash = ComputeHash(text);
        var fileName = $"{hash}.mp3";
        var filePath = Path.Combine(_audioDir, fileName);
        var url = $"/audio-cache/{fileName}";

        if (File.Exists(filePath))
            return url; // Already cached

        // Generate
        var audioBytes = await GenerateSpeechAsync(text);
        if (audioBytes.Length == 0) return "";

        await File.WriteAllBytesAsync(filePath, audioBytes);
        _logger.LogInformation("Audio generated and cached: {Hash} ({Length} bytes)", hash, audioBytes.Length);

        return url;
    }

    private static string ComputeHash(string text)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(text));
        return Convert.ToHexString(bytes)[..16].ToLower();
    }
}
