using BigBoss.Core.DTOs.Lives;
using BigBoss.Core.Entities;
using BigBoss.Core.Interfaces;
using BigBoss.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BigBoss.Infrastructure.Services;

public class LiveService : ILiveService
{
    private readonly BigBossDbContext _context;
    private readonly ILogger<LiveService> _logger;

    public LiveService(BigBossDbContext context, ILogger<LiveService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<IEnumerable<LiveListDto>> GetAllAsync()
    {
        var lives = await _context.Lives
            .OrderByDescending(l => l.ScheduledAt)
            .ToListAsync();

        return lives.Select(MapToListDto);
    }

    public async Task<IEnumerable<LiveListDto>> GetUpcomingAsync(int count = 10)
    {
        var now = DateTime.UtcNow;
        var lives = await _context.Lives
            .Where(l => l.ScheduledAt > now && l.EndedAt == null)
            .OrderBy(l => l.ScheduledAt)
            .Take(count)
            .ToListAsync();

        return lives.Select(MapToListDto);
    }

    public async Task<LiveDto?> GetByIdAsync(Guid id)
    {
        var live = await _context.Lives.FindAsync(id);
        return live == null ? null : MapToDto(live);
    }

    public async Task<LiveDto> CreateAsync(CreateLiveDto dto)
    {
        var live = new Live
        {
            Id = Guid.NewGuid(),
            Title = dto.Title,
            Description = dto.Description,
            Type = dto.Type,
            ScheduledAt = dto.ScheduledAt,
            StreamUrl = dto.StreamUrl,
            ThumbnailUrl = dto.ThumbnailUrl,
            GeneratedSessionId = dto.GeneratedSessionId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Lives.Add(live);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Live created: {Title} (ID: {Id})", live.Title, live.Id);

        return MapToDto(live);
    }

    public async Task<LiveDto?> UpdateAsync(Guid id, UpdateLiveDto dto)
    {
        var live = await _context.Lives.FindAsync(id);
        if (live == null) return null;

        if (dto.Title != null) live.Title = dto.Title;
        if (dto.Description != null) live.Description = dto.Description;
        if (dto.Type.HasValue) live.Type = dto.Type.Value;
        if (dto.ScheduledAt.HasValue) live.ScheduledAt = dto.ScheduledAt.Value;
        if (dto.StartedAt.HasValue) live.StartedAt = dto.StartedAt;
        if (dto.EndedAt.HasValue) live.EndedAt = dto.EndedAt;
        if (dto.StreamUrl != null) live.StreamUrl = dto.StreamUrl;
        if (dto.ReplayUrl != null) live.ReplayUrl = dto.ReplayUrl;
        if (dto.ThumbnailUrl != null) live.ThumbnailUrl = dto.ThumbnailUrl;
        if (dto.ChaptersJson != null) live.ChaptersJson = dto.ChaptersJson;
        if (dto.PeakViewers.HasValue) live.PeakViewers = dto.PeakViewers.Value;
        if (dto.TotalViews.HasValue) live.TotalViews = dto.TotalViews.Value;
        if (dto.TotalLikes.HasValue) live.TotalLikes = dto.TotalLikes.Value;
        if (dto.TotalComments.HasValue) live.TotalComments = dto.TotalComments.Value;
        if (dto.GeneratedSessionId.HasValue) live.GeneratedSessionId = dto.GeneratedSessionId;

        live.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Live updated: {Id}", id);

        return MapToDto(live);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var live = await _context.Lives.FindAsync(id);
        if (live == null) return false;

        _context.Lives.Remove(live);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Live deleted: {Id}", id);

        return true;
    }

    private static LiveDto MapToDto(Live live)
    {
        return new LiveDto
        {
            Id = live.Id,
            Title = live.Title,
            Description = live.Description,
            Type = live.Type,
            ScheduledAt = live.ScheduledAt,
            StartedAt = live.StartedAt,
            EndedAt = live.EndedAt,
            StreamUrl = live.StreamUrl,
            ReplayUrl = live.ReplayUrl,
            ThumbnailUrl = live.ThumbnailUrl,
            ChaptersJson = live.ChaptersJson,
            PeakViewers = live.PeakViewers,
            TotalViews = live.TotalViews,
            TotalLikes = live.TotalLikes,
            TotalComments = live.TotalComments,
            GeneratedSessionId = live.GeneratedSessionId,
            CreatedAt = live.CreatedAt,
            UpdatedAt = live.UpdatedAt
        };
    }

    private static LiveListDto MapToListDto(Live live)
    {
        return new LiveListDto
        {
            Id = live.Id,
            Title = live.Title,
            Type = live.Type,
            ScheduledAt = live.ScheduledAt,
            StartedAt = live.StartedAt,
            EndedAt = live.EndedAt,
            ThumbnailUrl = live.ThumbnailUrl,
            TotalViews = live.TotalViews
        };
    }
}
