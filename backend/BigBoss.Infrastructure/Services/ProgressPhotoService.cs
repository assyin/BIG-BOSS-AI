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
    private readonly ILogger<ProgressPhotoService> _logger;

    public ProgressPhotoService(BigBossDbContext context, ILogger<ProgressPhotoService> logger)
    {
        _context = context;
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
