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
    private readonly ILogger<TTSController> _logger;

    public TTSController(ITTSService tts, ILogger<TTSController> logger)
    {
        _tts = tts;
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
    /// Dev-only: génère depuis du texte sans auth. Pour debug rapide en curl.
    /// </summary>
    [HttpPost("dev-generate")]
    public async Task<IActionResult> DevGenerate([FromBody] GenerateRequest req)
    {
        if (!_tts.IsConfigured)
            return StatusCode(503, new { error = "TTS not configured" });
        var url = await _tts.GenerateSpeechUrlAsync(req.Text, req.Voice);
        return Ok(new { url });
    }

    /// <summary>État du service (configuré ou non, voix par défaut).</summary>
    [HttpGet("status")]
    public IActionResult Status()
    {
        return Ok(new
        {
            configured = _tts.IsConfigured,
            defaultVoice = GeminiTTSService.DEFAULT_VOICE,
            voices = new[] { "Charon", "Kore", "Puck", "Aoede", "Zephyr", "Fenrir", "Leda", "Orus" },
        });
    }
}
