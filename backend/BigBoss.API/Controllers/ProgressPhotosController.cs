using BigBoss.Core.DTOs.ProgressPhotos;
using BigBoss.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BigBoss.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProgressPhotosController : ControllerBase
{
    private readonly IProgressPhotoService _progressPhotoService;
    private readonly ILogger<ProgressPhotosController> _logger;

    public ProgressPhotosController(IProgressPhotoService progressPhotoService, ILogger<ProgressPhotosController> logger)
    {
        _progressPhotoService = progressPhotoService;
        _logger = logger;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    /// <summary>
    /// Get all progress photos for the current user
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProgressPhotoDto>>> GetAll()
    {
        var userId = GetUserId();
        var photos = await _progressPhotoService.GetByUserIdAsync(userId);
        return Ok(photos);
    }

    /// <summary>
    /// Get progress photo by ID
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ProgressPhotoDto>> GetById(Guid id)
    {
        var userId = GetUserId();
        var photo = await _progressPhotoService.GetByIdAsync(id, userId);

        if (photo == null)
            return NotFound(new { message = "Photo non trouvee" });

        return Ok(photo);
    }

    /// <summary>
    /// Create a new progress photo
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ProgressPhotoDto>> Create([FromBody] CreateProgressPhotoDto dto)
    {
        var userId = GetUserId();
        var photo = await _progressPhotoService.CreateAsync(userId, dto);
        return CreatedAtAction(nameof(GetById), new { id = photo.Id }, photo);
    }

    /// <summary>
    /// Update a progress photo
    /// </summary>
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ProgressPhotoDto>> Update(Guid id, [FromBody] UpdateProgressPhotoDto dto)
    {
        var userId = GetUserId();
        var photo = await _progressPhotoService.UpdateAsync(id, userId, dto);

        if (photo == null)
            return NotFound(new { message = "Photo non trouvee" });

        return Ok(photo);
    }

    /// <summary>
    /// Delete a progress photo
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = GetUserId();
        var result = await _progressPhotoService.DeleteAsync(id, userId);

        if (!result)
            return NotFound(new { message = "Photo non trouvee" });

        return NoContent();
    }

    public record AnalyzeRequest(string PhotoBase64);

    /// <summary>
    /// Sprint 4.4 — Analyse IA Claude Vision de la photo.
    /// Body: { "photoBase64": "..." } — l'image en base64 (sans préfixe data:image/...)
    /// Retour: { "analysis": { ...JSON Claude... } } avec body fat estimé, masse musculaire, recommandations.
    /// </summary>
    [HttpPost("{id:guid}/analyze")]
    public async Task<IActionResult> Analyze(Guid id, [FromBody] AnalyzeRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.PhotoBase64))
            return BadRequest(new { error = "photoBase64 required" });

        // Clean prefix data:image/... if present
        var base64 = request.PhotoBase64;
        var commaIdx = base64.IndexOf(',');
        if (base64.StartsWith("data:") && commaIdx > 0)
        {
            base64 = base64[(commaIdx + 1)..];
        }

        try
        {
            var userId = GetUserId();
            var result = await _progressPhotoService.AnalyzePhotoAsync(id, userId, base64);
            if (result == null)
                return NotFound(new { message = "Photo non trouvée" });

            return Ok(new
            {
                analysis = System.Text.Json.JsonDocument.Parse(result).RootElement,
                rawJson = result,
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Photo analysis failed for {Id}", id);
            return StatusCode(502, new { error = "Analyse IA échouée. Réessaie dans quelques secondes." });
        }
    }
}
