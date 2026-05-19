using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace BigBoss.Infrastructure.Services;

/// <summary>
/// Sprint 5.3 — Cloudflare Stream API client.
///
/// Permet de :
///   1. Créer un live input (RTMP key pour OBS + HLS URL pour viewers)
///   2. Lister les inputs / récupérer leur statut
///   3. Activer le replay (DVR) — Cloudflare enregistre automatiquement après le live
///
/// Mode mock : si BBF_CF_STREAM_API_TOKEN non configuré, retourne des URLs factices
/// pour permettre le dev mobile sans compte Cloudflare Stream.
///
/// Doc: https://developers.cloudflare.com/stream/stream-live/
/// </summary>
public interface ICloudflareStreamService
{
    bool IsConfigured { get; }
    Task<LiveInputResult> CreateLiveInputAsync(string meta);
    Task<LiveInputStatus> GetLiveInputStatusAsync(string liveInputUid);
    Task<bool> DeleteLiveInputAsync(string liveInputUid);
}

public record LiveInputResult(
    string LiveInputUid,        // ID Cloudflare interne
    string RtmpUrl,              // pour OBS push (server URL)
    string RtmpKey,              // stream key OBS
    string HlsUrl,               // pour viewers mobile (HLS m3u8)
    string DashUrl,              // pour viewers web/dash
    string? PlaybackId,          // pour player iframe Cloudflare
    bool IsMock                  // true si pas de creds CF
);

public record LiveInputStatus(
    string LiveInputUid,
    string State,                // "connected" | "disconnected" | "live" | "idle"
    int? CurrentViewers,
    string? CurrentVideoUid      // video UID si live en cours (utile pour replay après)
);

public class CloudflareStreamService : ICloudflareStreamService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<CloudflareStreamService> _logger;
    private readonly string _accountId;
    private readonly string _apiToken;
    private readonly string _customerSubdomain;

    public bool IsConfigured =>
        !string.IsNullOrEmpty(_accountId)
        && _accountId != "placeholder"
        && !string.IsNullOrEmpty(_apiToken);

    public CloudflareStreamService(HttpClient httpClient, IConfiguration config, ILogger<CloudflareStreamService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;

        // Réutilise account ID du même Cloudflare account que R2
        _accountId = config["BBF_CLOUDFLARE_ACCOUNT_ID"]
            ?? config["BBF_CF_ACCOUNT_ID"]
            ?? "";
        // Token spécifique Stream API (permission Stream:Edit)
        _apiToken = config["BBF_CF_STREAM_API_TOKEN"] ?? "";
        // Sous-domaine customer.cloudflarestream.com pour HLS playback
        _customerSubdomain = config["BBF_CF_STREAM_CUSTOMER_SUBDOMAIN"] ?? "customer-bbf";

        if (!string.IsNullOrEmpty(_apiToken))
        {
            _httpClient.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", _apiToken);
        }
    }

    public async Task<LiveInputResult> CreateLiveInputAsync(string meta)
    {
        if (!IsConfigured)
        {
            _logger.LogWarning("Cloudflare Stream not configured — returning mock URLs");
            return MockLiveInput(meta);
        }

        var url = $"https://api.cloudflare.com/client/v4/accounts/{_accountId}/stream/live_inputs";
        var payload = new
        {
            meta = new { name = meta },
            recording = new
            {
                mode = "automatic",     // enregistre automatiquement pour replay
                timeoutSeconds = 10,
                requireSignedURLs = false,
                allowedOrigins = Array.Empty<string>()
            }
        };

        try
        {
            using var response = await _httpClient.PostAsJsonAsync(url, payload);
            if (!response.IsSuccessStatusCode)
            {
                var err = await response.Content.ReadAsStringAsync();
                _logger.LogError("CF Stream create live input failed: {Status} {Body}",
                    response.StatusCode, err[..Math.Min(500, err.Length)]);
                return MockLiveInput(meta);
            }

            var body = await response.Content.ReadAsByteArrayAsync();
            using var doc = JsonDocument.Parse(body);
            var result = doc.RootElement.GetProperty("result");

            var uid = result.GetProperty("uid").GetString() ?? "";
            var rtmps = result.GetProperty("rtmps");
            var rtmpUrl = rtmps.GetProperty("url").GetString() ?? "";
            var rtmpKey = rtmps.GetProperty("streamKey").GetString() ?? "";

            var hlsUrl = $"https://{_customerSubdomain}.cloudflarestream.com/{uid}/manifest/video.m3u8";
            var dashUrl = $"https://{_customerSubdomain}.cloudflarestream.com/{uid}/manifest/video.mpd";

            _logger.LogInformation("CF Stream live input created: {Uid} for {Meta}", uid, meta);

            return new LiveInputResult(uid, rtmpUrl, rtmpKey, hlsUrl, dashUrl, uid, false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "CF Stream create live input exception");
            return MockLiveInput(meta);
        }
    }

    public async Task<LiveInputStatus> GetLiveInputStatusAsync(string liveInputUid)
    {
        if (!IsConfigured)
        {
            return new LiveInputStatus(liveInputUid, "mock-idle", 0, null);
        }

        var url = $"https://api.cloudflare.com/client/v4/accounts/{_accountId}/stream/live_inputs/{liveInputUid}";
        try
        {
            using var response = await _httpClient.GetAsync(url);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("CF Stream status fetch failed: {Status}", response.StatusCode);
                return new LiveInputStatus(liveInputUid, "unknown", null, null);
            }
            var body = await response.Content.ReadAsByteArrayAsync();
            using var doc = JsonDocument.Parse(body);
            var result = doc.RootElement.GetProperty("result");

            string state = "idle";
            if (result.TryGetProperty("status", out var statusElement)
                && statusElement.TryGetProperty("current", out var current)
                && current.TryGetProperty("state", out var stateElement))
            {
                state = stateElement.GetString() ?? "idle";
            }

            // CurrentVideoUid si en cours
            string? videoUid = null;
            if (result.TryGetProperty("status", out var s2)
                && s2.TryGetProperty("current", out var c2)
                && c2.TryGetProperty("ingestProtocol", out _))
            {
                // Le video UID n'est pas toujours présent au début, le webhook le confirmera
                videoUid = null;
            }

            return new LiveInputStatus(liveInputUid, state, null, videoUid);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "CF Stream status exception");
            return new LiveInputStatus(liveInputUid, "error", null, null);
        }
    }

    public async Task<bool> DeleteLiveInputAsync(string liveInputUid)
    {
        if (!IsConfigured) return true;

        var url = $"https://api.cloudflare.com/client/v4/accounts/{_accountId}/stream/live_inputs/{liveInputUid}";
        try
        {
            using var response = await _httpClient.DeleteAsync(url);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "CF Stream delete exception");
            return false;
        }
    }

    private static LiveInputResult MockLiveInput(string meta)
    {
        var mockUid = $"mock-{Guid.NewGuid():N}"[..16];
        return new LiveInputResult(
            LiveInputUid: mockUid,
            RtmpUrl: "rtmps://mock-stream.example.com/live",
            RtmpKey: $"mock-key-{mockUid}",
            HlsUrl: $"https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", // public Mux test stream
            DashUrl: "",
            PlaybackId: mockUid,
            IsMock: true
        );
    }
}
