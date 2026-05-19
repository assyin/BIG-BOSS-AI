using BigBoss.Core.DTOs.ProgressPhotos;
using BigBoss.Core.Entities;
using BigBoss.Core.Interfaces;
using BigBoss.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BigBoss.Infrastructure.Services;

public class ProgressPhotoService : IProgressPhotoService
{
    private readonly BigBossDbContext _context;
    private readonly IClaudeService _claude;
    private readonly ILogger<ProgressPhotoService> _logger;

    public ProgressPhotoService(BigBossDbContext context, IClaudeService claude, ILogger<ProgressPhotoService> logger)
    {
        _context = context;
        _claude = claude;
        _logger = logger;
    }

    public async Task<IEnumerable<ProgressPhotoDto>> GetByUserIdAsync(Guid userId)
    {
        var photos = await _context.ProgressPhotos
            .Where(p => p.UserId == userId)
            .OrderByDescending(p => p.TakenAt)
            .ToListAsync();

        return photos.Select(MapToDto);
    }

    public async Task<ProgressPhotoDto?> GetByIdAsync(Guid id, Guid userId)
    {
        var photo = await _context.ProgressPhotos
            .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);

        return photo == null ? null : MapToDto(photo);
    }

    public async Task<ProgressPhotoDto> CreateAsync(Guid userId, CreateProgressPhotoDto dto)
    {
        var photo = new ProgressPhoto
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            TakenAt = dto.TakenAt ?? DateTime.UtcNow,
            StorageUrlEncrypted = dto.StorageUrlEncrypted,
            PoseType = dto.PoseType,
            IsSharedCommunity = dto.IsSharedCommunity,
            CreatedAt = DateTime.UtcNow
        };

        _context.ProgressPhotos.Add(photo);
        await _context.SaveChangesAsync();

        _logger.LogInformation("ProgressPhoto created for user {UserId} (ID: {Id})", userId, photo.Id);

        return MapToDto(photo);
    }

    public async Task<ProgressPhotoDto?> UpdateAsync(Guid id, Guid userId, UpdateProgressPhotoDto dto)
    {
        var photo = await _context.ProgressPhotos
            .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);

        if (photo == null) return null;

        if (dto.PoseType != null) photo.PoseType = dto.PoseType;
        if (dto.AiAnalysisJson != null) photo.AiAnalysisJson = dto.AiAnalysisJson;
        if (dto.EstimatedBodyFatPercent.HasValue) photo.EstimatedBodyFatPercent = dto.EstimatedBodyFatPercent;
        if (dto.IsSharedCommunity.HasValue) photo.IsSharedCommunity = dto.IsSharedCommunity.Value;

        await _context.SaveChangesAsync();

        _logger.LogInformation("ProgressPhoto updated: {Id}", id);

        return MapToDto(photo);
    }

    public async Task<bool> DeleteAsync(Guid id, Guid userId)
    {
        var photo = await _context.ProgressPhotos
            .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);

        if (photo == null) return false;

        _context.ProgressPhotos.Remove(photo);
        await _context.SaveChangesAsync();

        _logger.LogInformation("ProgressPhoto deleted: {Id}", id);

        return true;
    }

    /// <summary>
    /// Sprint 4.4 — Analyse la photo via Claude Vision et stocke le JSON résultat
    /// dans <see cref="ProgressPhoto.AiAnalysisJson"/>. Retourne le JSON parsé.
    /// </summary>
    public async Task<string?> AnalyzePhotoAsync(Guid photoId, Guid userId, string imageBase64)
    {
        // 1. Vérifier ownership + récupérer photo + user pour le contexte
        var photo = await _context.ProgressPhotos
            .FirstOrDefaultAsync(p => p.Id == photoId && p.UserId == userId);
        if (photo == null) return null;

        var user = await _context.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return null;

        // 2. Construire le contexte utilisateur pour Claude
        var ctx = new ProgressPhotoAnalysisContext(
            Gender: user.Gender,
            WeightKg: user.WeightKg,
            HeightCm: user.HeightCm,
            BodyFatPercent: user.BodyFatPercent,
            Goal: user.Goal.ToString(),
            PoseType: photo.PoseType
        );

        // 3. Appel Claude Vision (Sonnet pour meilleure qualité analyse)
        string analysis;
        try
        {
            analysis = await _claude.AnalyzeProgressPhotoAsync(imageBase64, ctx);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Claude Vision analysis failed for photo {PhotoId}", photoId);
            throw;
        }

        // 4. Nettoyer le JSON (Claude peut entourer de markdown ```json...```)
        analysis = CleanJsonResponse(analysis);

        // 5. Stocker en DB + extraire bodyFatEstimate si dispo
        photo.AiAnalysisJson = analysis;
        try
        {
            using var doc = System.Text.Json.JsonDocument.Parse(analysis);
            if (doc.RootElement.TryGetProperty("bodyFatEstimate", out var bfElement))
            {
                if (bfElement.ValueKind == System.Text.Json.JsonValueKind.Number)
                {
                    photo.EstimatedBodyFatPercent = bfElement.GetDecimal();
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not parse bodyFatEstimate from Claude response");
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Photo {PhotoId} analyzed by Claude Vision", photoId);

        return analysis;
    }

    private static string CleanJsonResponse(string text)
    {
        var trimmed = text.Trim();
        if (trimmed.StartsWith("```json")) trimmed = trimmed[7..];
        else if (trimmed.StartsWith("```")) trimmed = trimmed[3..];
        if (trimmed.EndsWith("```")) trimmed = trimmed[..^3];
        return trimmed.Trim();
    }

    private static ProgressPhotoDto MapToDto(ProgressPhoto photo)
    {
        return new ProgressPhotoDto
        {
            Id = photo.Id,
            UserId = photo.UserId,
            TakenAt = photo.TakenAt,
            StorageUrlEncrypted = photo.StorageUrlEncrypted,
            PoseType = photo.PoseType,
            AiAnalysisJson = photo.AiAnalysisJson,
            EstimatedBodyFatPercent = photo.EstimatedBodyFatPercent,
            IsSharedCommunity = photo.IsSharedCommunity,
            CreatedAt = photo.CreatedAt
        };
    }
}
