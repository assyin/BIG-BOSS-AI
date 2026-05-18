using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace BigBoss.Infrastructure.Services;

/// <summary>
/// Sprint 4.1 — TTS via Google Gemini 2.5 Flash native audio.
///
/// Pourquoi Gemini plutôt qu'ElevenLabs:
///   - Qualité darija nettement supérieure (testé par Yassine)
///   - Prix ~100x moins cher (~$0.40 / 1M chars vs $99/mois ElevenLabs)
///   - Aucune coordination influenceur requise pour démarrer
///
/// Gemini retourne du PCM 24kHz que ce service wrap en WAV (header + data) pour
/// jouer simplement côté mobile (expo-av Audio.Sound).
/// </summary>
public interface ITTSService
{
    Task<byte[]> GenerateSpeechAsync(string text, string? voice = null);
    Task<string> GenerateSpeechUrlAsync(string text, string? voice = null);
    bool IsConfigured { get; }
}

public class GeminiTTSService : ITTSService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<GeminiTTSService> _logger;
    private readonly string _apiKey;
    private readonly string _defaultVoice;
    private readonly string _audioDir;

    private const string ENDPOINT =
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent";

    // Voix recommandées (testées pour multilingue arabe/darija)
    //   "Kore"    : ferme, motivant — bon pour coach masculin
    //   "Charon"  : informatif, naturel
    //   "Aoede"   : breezy, energique
    //   "Puck"    : upbeat, enthousiaste — bon pour encouragements
    //   "Zephyr"  : bright, clair
    public const string DEFAULT_VOICE = "Charon";

    public bool IsConfigured => !string.IsNullOrEmpty(_apiKey);

    public GeminiTTSService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<GeminiTTSService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _apiKey = configuration["BBF_GEMINI_API_KEY"] ?? "";
        _defaultVoice = configuration["BBF_GEMINI_TTS_VOICE"] ?? DEFAULT_VOICE;

        var projectRoot = Directory.GetCurrentDirectory();
        _audioDir = Path.Combine(Directory.GetParent(projectRoot)?.FullName ?? projectRoot, "audio-cache");
        Directory.CreateDirectory(_audioDir);
    }

    public async Task<byte[]> GenerateSpeechAsync(string text, string? voice = null)
    {
        if (!IsConfigured)
        {
            _logger.LogWarning("Gemini TTS not configured (set BBF_GEMINI_API_KEY)");
            return Array.Empty<byte>();
        }

        var voiceName = voice ?? _defaultVoice;
        var payload = new
        {
            contents = new[]
            {
                new { parts = new[] { new { text } } }
            },
            generationConfig = new
            {
                responseModalities = new[] { "AUDIO" },
                speechConfig = new
                {
                    voiceConfig = new
                    {
                        prebuiltVoiceConfig = new { voiceName }
                    }
                }
            }
        };

        var url = $"{ENDPOINT}?key={_apiKey}";
        using var response = await _httpClient.PostAsJsonAsync(url, payload);

        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync();
            _logger.LogError("Gemini TTS HTTP {StatusCode}: {Error}",
                response.StatusCode, error[..Math.Min(500, error.Length)]);
            return Array.Empty<byte>();
        }

        // Read as byte array (more reliable for large responses ~150KB)
        // ReadAsStringAsync peut être tronqué avec ChunkedEncoding sur certains payloads
        var bytes = await response.Content.ReadAsByteArrayAsync();
        if (bytes.Length == 0)
        {
            _logger.LogError("Gemini TTS: empty response body");
            return Array.Empty<byte>();
        }

        try
        {
            using var doc = JsonDocument.Parse(bytes);
            var inlineData = doc.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("inlineData");

            var b64 = inlineData.GetProperty("data").GetString() ?? "";
            var pcm = Convert.FromBase64String(b64);
            return WrapPcmInWav(pcm, sampleRate: 24000, channels: 1, bitsPerSample: 16);
        }
        catch (Exception ex)
        {
            // Log full body to disk pour debug
            var debugPath = Path.Combine(_audioDir, $"debug-{DateTime.UtcNow:yyyyMMdd-HHmmss}.json");
            try { await File.WriteAllBytesAsync(debugPath, bytes); } catch {/* ignore */}
            var preview = System.Text.Encoding.UTF8.GetString(bytes, 0, Math.Min(500, bytes.Length));
            _logger.LogError(ex, "Gemini TTS parse fail. Body ({Size} bytes) saved to {Path}. Preview: {Preview}",
                bytes.Length, debugPath, preview);
            return Array.Empty<byte>();
        }
    }

    /// <summary>Génère + cache l'audio. Retourne URL relative (/audio-cache/{hash}.wav).</summary>
    public async Task<string> GenerateSpeechUrlAsync(string text, string? voice = null)
    {
        if (!IsConfigured) return "";

        var hash = ComputeHash($"{voice ?? _defaultVoice}::{text}");
        var fileName = $"{hash}.wav";
        var filePath = Path.Combine(_audioDir, fileName);
        var url = $"/audio-cache/{fileName}";

        if (File.Exists(filePath))
        {
            _logger.LogDebug("Gemini TTS cache hit: {Hash}", hash);
            return url;
        }

        var audioBytes = await GenerateSpeechAsync(text, voice);
        if (audioBytes.Length == 0) return "";

        await File.WriteAllBytesAsync(filePath, audioBytes);
        _logger.LogInformation("Gemini TTS generated + cached: {Hash} ({Bytes} bytes, voice={Voice})",
            hash, audioBytes.Length, voice ?? _defaultVoice);
        return url;
    }

    // ─── Helpers ──────────────────────────────────────────────

    private static string ComputeHash(string input)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(bytes)[..16].ToLower();
    }

    /// <summary>
    /// Préfixe les bytes PCM bruts avec un header WAV RIFF (44 bytes) pour
    /// produire un fichier .wav jouable par n'importe quel lecteur audio.
    /// </summary>
    private static byte[] WrapPcmInWav(byte[] pcm, int sampleRate, short channels, short bitsPerSample)
    {
        var byteRate = sampleRate * channels * bitsPerSample / 8;
        var blockAlign = (short)(channels * bitsPerSample / 8);

        using var ms = new MemoryStream();
        using var bw = new BinaryWriter(ms);

        bw.Write(System.Text.Encoding.ASCII.GetBytes("RIFF"));
        bw.Write(36 + pcm.Length);                   // ChunkSize
        bw.Write(System.Text.Encoding.ASCII.GetBytes("WAVE"));
        bw.Write(System.Text.Encoding.ASCII.GetBytes("fmt "));
        bw.Write(16);                                // Subchunk1Size
        bw.Write((short)1);                          // PCM format
        bw.Write(channels);
        bw.Write(sampleRate);
        bw.Write(byteRate);
        bw.Write(blockAlign);
        bw.Write(bitsPerSample);
        bw.Write(System.Text.Encoding.ASCII.GetBytes("data"));
        bw.Write(pcm.Length);
        bw.Write(pcm);

        return ms.ToArray();
    }
}
