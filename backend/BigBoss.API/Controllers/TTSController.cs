using BigBoss.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BigBoss.API.Controllers;

/// <summary>
/// Sprint 4.1 — Endpoints TTS (Gemini darija + future hybride avec voix influenceur).
/// </summary>
[ApiController]
[Route("api/tts")]
public class TTSController : ControllerBase
{
    private readonly ITTSService _tts;
    private readonly GeminiTTSService _gemini;
    private readonly ILogger<TTSController> _logger;

    public TTSController(ITTSService tts, GeminiTTSService gemini, ILogger<TTSController> logger)
    {
        _tts = tts;
        _gemini = gemini;
        _logger = logger;
    }

    public record GenerateRequest(string Text, string? Voice = null);

    /// <summary>
    /// Génère un audio WAV depuis un texte (FR + darija + AR supportés).
    /// Réponse: { url: "/audio-cache/{hash}.wav", cached: bool }
    /// </summary>
    [HttpPost("generate")]
    [Authorize]
    public async Task<IActionResult> Generate([FromBody] GenerateRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Text))
            return BadRequest(new { error = "text required" });

        if (req.Text.Length > 5000)
            return BadRequest(new { error = "text too long (max 5000 chars)" });

        if (!_tts.IsConfigured)
            return StatusCode(503, new { error = "TTS service not configured (BBF_GEMINI_API_KEY missing)" });

        var url = await _tts.GenerateSpeechUrlAsync(req.Text, req.Voice);
        if (string.IsNullOrEmpty(url))
            return StatusCode(502, new { error = "TTS generation failed (see backend logs)" });

        return Ok(new { url, voice = req.Voice ?? GeminiTTSService.DEFAULT_VOICE });
    }

    /// <summary>
    /// Dev-only: génère depuis du texte sans auth (utilise le service par défaut Azure).
    /// </summary>
    [HttpPost("dev-generate")]
    public async Task<IActionResult> DevGenerate([FromBody] GenerateRequest req)
    {
        if (!_tts.IsConfigured)
            return StatusCode(503, new { error = "TTS not configured" });
        var url = await _tts.GenerateSpeechUrlAsync(req.Text, req.Voice);
        return Ok(new { url, provider = "azure" });
    }

    /// <summary>
    /// Dev-only: génère via Gemini TTS directement (pour comparaison avec Azure).
    /// Voix Gemini: Aoede, Kore, Charon, Puck, Zephyr, Fenrir, Leda, Orus.
    /// </summary>
    [HttpPost("dev-gemini")]
    public async Task<IActionResult> DevGemini([FromBody] GenerateRequest req)
    {
        if (!_gemini.IsConfigured)
            return StatusCode(503, new { error = "Gemini TTS not configured" });
        var voice = req.Voice ?? "Aoede";
        var url = await _gemini.GenerateSpeechUrlAsync(req.Text, voice);
        return Ok(new { url, provider = "gemini", voice });
    }

    /// <summary>État du service (configuré ou non, voix par défaut).</summary>
    [HttpGet("status")]
    public IActionResult Status()
    {
        return Ok(new
        {
            configured = _tts.IsConfigured,
            provider = "Azure Speech",
            defaultVoice = AzureTTSService.DEFAULT_VOICE,
            voices = new[]
            {
                new { name = "ar-MA-MounaNeural", lang = "darija", gender = "Female" },
                new { name = "ar-MA-JamalNeural",  lang = "darija", gender = "Male" },
                new { name = "fr-FR-HenriNeural",  lang = "français", gender = "Male" },
                new { name = "fr-FR-DeniseNeural", lang = "français", gender = "Female" },
                new { name = "ar-EG-SalmaNeural",  lang = "arabe-eg", gender = "Female" },
            },
        });
    }
}
