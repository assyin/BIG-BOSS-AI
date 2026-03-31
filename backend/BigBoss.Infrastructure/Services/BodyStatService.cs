using BigBoss.Core.DTOs.BodyStats;
using BigBoss.Core.Entities;
using BigBoss.Core.Interfaces;
using BigBoss.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BigBoss.Infrastructure.Services;

public class BodyStatService : IBodyStatService
{
    private readonly BigBossDbContext _context;
    private readonly ILogger<BodyStatService> _logger;

    public BodyStatService(BigBossDbContext context, ILogger<BodyStatService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<IEnumerable<BodyStatDto>> GetByUserIdAsync(Guid userId)
    {
        var stats = await _context.BodyStats
            .Where(b => b.UserId == userId)
            .OrderByDescending(b => b.RecordedAt)
            .ToListAsync();

        return stats.Select(MapToDto);
    }

    public async Task<BodyStatDto?> GetByIdAsync(Guid id, Guid userId)
    {
        var stat = await _context.BodyStats
            .FirstOrDefaultAsync(b => b.Id == id && b.UserId == userId);

        return stat == null ? null : MapToDto(stat);
    }

    public async Task<BodyStatDto> CreateAsync(Guid userId, CreateBodyStatDto dto)
    {
        var stat = new BodyStat
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            RecordedAt = dto.RecordedAt ?? DateTime.UtcNow,
            WeightKg = dto.WeightKg,
            BodyFatPercent = dto.BodyFatPercent,
            ChestCm = dto.ChestCm,
            WaistCm = dto.WaistCm,
            HipsCm = dto.HipsCm,
            LeftArmCm = dto.LeftArmCm,
            RightArmCm = dto.RightArmCm,
            LeftThighCm = dto.LeftThighCm,
            RightThighCm = dto.RightThighCm,
            LeftCalfCm = dto.LeftCalfCm,
            RightCalfCm = dto.RightCalfCm,
            ShouldersCm = dto.ShouldersCm,
            NeckCm = dto.NeckCm,
            Notes = dto.Notes
        };

        _context.BodyStats.Add(stat);
        await _context.SaveChangesAsync();

        _logger.LogInformation("BodyStat created for user {UserId} (ID: {Id})", userId, stat.Id);

        return MapToDto(stat);
    }

    public async Task<BodyStatDto?> UpdateAsync(Guid id, Guid userId, UpdateBodyStatDto dto)
    {
        var stat = await _context.BodyStats
            .FirstOrDefaultAsync(b => b.Id == id && b.UserId == userId);

        if (stat == null) return null;

        if (dto.RecordedAt.HasValue) stat.RecordedAt = dto.RecordedAt.Value;
        if (dto.WeightKg.HasValue) stat.WeightKg = dto.WeightKg;
        if (dto.BodyFatPercent.HasValue) stat.BodyFatPercent = dto.BodyFatPercent;
        if (dto.ChestCm.HasValue) stat.ChestCm = dto.ChestCm;
        if (dto.WaistCm.HasValue) stat.WaistCm = dto.WaistCm;
        if (dto.HipsCm.HasValue) stat.HipsCm = dto.HipsCm;
        if (dto.LeftArmCm.HasValue) stat.LeftArmCm = dto.LeftArmCm;
        if (dto.RightArmCm.HasValue) stat.RightArmCm = dto.RightArmCm;
        if (dto.LeftThighCm.HasValue) stat.LeftThighCm = dto.LeftThighCm;
        if (dto.RightThighCm.HasValue) stat.RightThighCm = dto.RightThighCm;
        if (dto.LeftCalfCm.HasValue) stat.LeftCalfCm = dto.LeftCalfCm;
        if (dto.RightCalfCm.HasValue) stat.RightCalfCm = dto.RightCalfCm;
        if (dto.ShouldersCm.HasValue) stat.ShouldersCm = dto.ShouldersCm;
        if (dto.NeckCm.HasValue) stat.NeckCm = dto.NeckCm;
        if (dto.Notes != null) stat.Notes = dto.Notes;

        await _context.SaveChangesAsync();

        _logger.LogInformation("BodyStat updated: {Id}", id);

        return MapToDto(stat);
    }

    public async Task<bool> DeleteAsync(Guid id, Guid userId)
    {
        var stat = await _context.BodyStats
            .FirstOrDefaultAsync(b => b.Id == id && b.UserId == userId);

        if (stat == null) return false;

        _context.BodyStats.Remove(stat);
        await _context.SaveChangesAsync();

        _logger.LogInformation("BodyStat deleted: {Id}", id);

        return true;
    }

    public async Task<BodyStatDto?> GetLatestAsync(Guid userId)
    {
        var stat = await _context.BodyStats
            .Where(b => b.UserId == userId)
            .OrderByDescending(b => b.RecordedAt)
            .FirstOrDefaultAsync();

        return stat == null ? null : MapToDto(stat);
    }

    private static BodyStatDto MapToDto(BodyStat stat)
    {
        return new BodyStatDto
        {
            Id = stat.Id,
            UserId = stat.UserId,
            RecordedAt = stat.RecordedAt,
            WeightKg = stat.WeightKg,
            BodyFatPercent = stat.BodyFatPercent,
            ChestCm = stat.ChestCm,
            WaistCm = stat.WaistCm,
            HipsCm = stat.HipsCm,
            LeftArmCm = stat.LeftArmCm,
            RightArmCm = stat.RightArmCm,
            LeftThighCm = stat.LeftThighCm,
            RightThighCm = stat.RightThighCm,
            LeftCalfCm = stat.LeftCalfCm,
            RightCalfCm = stat.RightCalfCm,
            ShouldersCm = stat.ShouldersCm,
            NeckCm = stat.NeckCm,
            Notes = stat.Notes
        };
    }
}
