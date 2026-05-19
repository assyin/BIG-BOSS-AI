using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Xml.Linq;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace BigBoss.Infrastructure.Services;

/// <summary>
/// Sprint 4.1 — TTS via Microsoft Azure Speech Services.
///
/// Pourquoi Azure plutôt que Gemini/ElevenLabs:
///   - Voix darija marocain natives (ar-MA-MounaNeural féminin, ar-MA-JamalNeural masculin)
///   - Trained par Microsoft sur corpus marocain réel
///   - Prix raisonnable: 500K chars/mois GRATUIT en free tier (F0), $16/1M chars ensuite
///   - Latence p95 ~250ms region France Central
///   - SDK .NET officiel disponible (on utilise REST direct pour rester léger)
///
/// API: REST endpoint avec SSML body + clé subscription dans header.
/// Doc: https://learn.microsoft.com/azure/ai-services/speech-service/rest-text-to-speech
/// </summary>
public class AzureTTSService : ITTSService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<AzureTTSService> _logger;
    private readonly string _apiKey;
    private readonly string _region;
    private readonly string _audioDir;
    private readonly string _defaultVoice;

    public const string DEFAULT_VOICE = "ar-MA-MounaNeural"; // féminin darija marocain
    public const string MASCULINE_VOICE = "ar-MA-JamalNeural"; // masculin darija marocain
    public const string FRENCH_VOICE = "fr-FR-HenriNeural";   // masculin français

    public bool IsConfigured => !string.IsNullOrEmpty(_apiKey) && !string.IsNullOrEmpty(_region);

    public AzureTTSService(HttpClient httpClient, IConfiguration config, ILogger<AzureTTSService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _apiKey = config["BBF_AZURE_SPEECH_KEY"] ?? "";
        _region = config["BBF_AZURE_SPEECH_REGION"] ?? "francecentral";
        _defaultVoice = config["BBF_AZURE_SPEECH_VOICE"] ?? DEFAULT_VOICE;

        var projectRoot = Directory.GetCurrentDirectory();
        _audioDir = Path.Combine(Directory.GetParent(projectRoot)?.FullName ?? projectRoot, "audio-cache");
        Directory.CreateDirectory(_audioDir);
    }

    public async Task<byte[]> GenerateSpeechAsync(string text, string? voice = null)
    {
        if (!IsConfigured)
        {
            _logger.LogWarning("Azure TTS not configured (set BBF_AZURE_SPEECH_KEY + BBF_AZURE_SPEECH_REGION)");
            return Array.Empty<byte>();
        }

        var voiceName = voice ?? _defaultVoice;
        var languageCode = ExtractLanguageCode(voiceName);
        var ssml = BuildSsml(text, voiceName, languageCode);

        var url = $"https://{_region}.tts.speech.microsoft.com/cognitiveservices/v1";
        using var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(ssml, Encoding.UTF8, "application/ssml+xml"),
        };
        request.Headers.Add("Ocp-Apim-Subscription-Key", _apiKey);
        request.Headers.Add("X-Microsoft-OutputFormat", "audio-24khz-48kbitrate-mono-mp3");
        request.Headers.Add("User-Agent", "BigBossFitness");

        using var response = await _httpClient.SendAsync(request);

        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync();
            _logger.LogError("Azure TTS HTTP {Status}: {Error}",
                response.StatusCode, error[..Math.Min(500, error.Length)]);
            return Array.Empty<byte>();
        }

        return await response.Content.ReadAsByteArrayAsync();
    }

    public async Task<string> GenerateSpeechUrlAsync(string text, string? voice = null)
    {
        if (!IsConfigured) return "";

        var voiceName = voice ?? _defaultVoice;
        var hash = ComputeHash($"{voiceName}::{text}");
        var fileName = $"{hash}.mp3";
        var filePath = Path.Combine(_audioDir, fileName);
        var url = $"/audio-cache/{fileName}";

        if (File.Exists(filePath))
        {
            _logger.LogDebug("Azure TTS cache hit: {Hash}", hash);
            return url;
        }

        var audioBytes = await GenerateSpeechAsync(text, voice);
        if (audioBytes.Length == 0) return "";

        await File.WriteAllBytesAsync(filePath, audioBytes);
        _logger.LogInformation("Azure TTS generated + cached: {Hash} ({Bytes} bytes, voice={Voice})",
            hash, audioBytes.Length, voiceName);
        return url;
    }

    // ─── Helpers ──────────────────────────────────────────────

    /// <summary>
    /// Build SSML envelope. Échappe les caractères XML spéciaux dans le texte.
    /// </summary>
    private static string BuildSsml(string text, string voiceName, string languageCode)
    {
        var escaped = System.Security.SecurityElement.Escape(text) ?? text;
        return $@"<speak version=""1.0"" xml:lang=""{languageCode}"" xmlns=""http://www.w3.org/2001/10/synthesis"">
  <voice name=""{voiceName}"">{escaped}</voice>
</speak>";
    }

    /// <summary>Extrait le code langue BCP-47 du nom de voix (ex: ar-MA-MounaNeural → ar-MA).</summary>
    private static string ExtractLanguageCode(string voiceName)
    {
        // Voix Azure: format {lang}-{region}-{Name}Neural ex: ar-MA-MounaNeural
        var parts = voiceName.Split('-');
        if (parts.Length >= 2) return $"{parts[0]}-{parts[1]}";
        return "ar-MA";
    }

    private static string ComputeHash(string input)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(bytes)[..16].ToLower();
    }
}
