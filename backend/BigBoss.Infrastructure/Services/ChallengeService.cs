using BigBoss.Core.DTOs.Challenges;
using BigBoss.Core.Entities;
using BigBoss.Core.Interfaces;
using BigBoss.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BigBoss.Infrastructure.Services;

public class ChallengeService : IChallengeService
{
    private readonly BigBossDbContext _context;
    private readonly ILogger<ChallengeService> _logger;

    public ChallengeService(BigBossDbContext context, ILogger<ChallengeService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<IEnumerable<ChallengeDto>> GetActiveChallengesAsync(Guid? userId = null)
    {
        var now = DateTime.UtcNow;
        var challenges = await _context.Challenges
            .Where(c => c.IsActive && c.StartDate <= now && c.EndDate >= now)
            .OrderByDescending(c => c.IsFeatured)
            .ThenBy(c => c.EndDate)
            .ToListAsync();

        return challenges.Select(c => MapToDto(c));
    }

    public async Task<ChallengeDto?> GetByIdAsync(Guid id, Guid? userId = null)
    {
        var challenge = await _context.Challenges.FindAsync(id);
        if (challenge == null) return null;

        return MapToDto(challenge);
    }

    public async Task<ChallengeDto> CreateAsync(CreateChallengeDto dto)
    {
        var challenge = new Challenge
        {
            Id = Guid.NewGuid(),
            Title = dto.Title,
            Description = dto.Description,
            ImageUrl = dto.ImageUrl,
            Type = dto.Type,
            MetricName = dto.MetricName,
            MetricUnit = dto.MetricUnit,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            RewardDescription = dto.RewardDescription,
            RewardImageUrl = dto.RewardImageUrl,
            IsFeatured = dto.IsFeatured,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Challenges.Add(challenge);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Challenge created: {Title} (ID: {Id})", challenge.Title, challenge.Id);

        return MapToDto(challenge);
    }

    public async Task<ChallengeDto?> UpdateAsync(Guid id, UpdateChallengeDto dto)
    {
        var challenge = await _context.Challenges.FindAsync(id);
        if (challenge == null) return null;

        if (dto.Title != null) challenge.Title = dto.Title;
        if (dto.Description != null) challenge.Description = dto.Description;
        if (dto.ImageUrl != null) challenge.ImageUrl = dto.ImageUrl;
        if (dto.MetricName != null) challenge.MetricName = dto.MetricName;
        if (dto.MetricUnit != null) challenge.MetricUnit = dto.MetricUnit;
        if (dto.StartDate.HasValue) challenge.StartDate = dto.StartDate.Value;
        if (dto.EndDate.HasValue) challenge.EndDate = dto.EndDate.Value;
        if (dto.RewardDescription != null) challenge.RewardDescription = dto.RewardDescription;
        if (dto.RewardImageUrl != null) challenge.RewardImageUrl = dto.RewardImageUrl;
        if (dto.IsActive.HasValue) challenge.IsActive = dto.IsActive.Value;
        if (dto.IsFeatured.HasValue) challenge.IsFeatured = dto.IsFeatured.Value;

        challenge.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Challenge updated: {Id}", id);

        return MapToDto(challenge);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var challenge = await _context.Challenges.FindAsync(id);
        if (challenge == null) return false;

        _context.Challenges.Remove(challenge);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Challenge deleted: {Id}", id);

        return true;
    }

    public async Task<ChallengeLeaderboardDto?> GetLeaderboardAsync(Guid challengeId, int top = 10)
    {
        var challenge = await _context.Challenges.FindAsync(challengeId);
        if (challenge == null) return null;

        // For now, return empty leaderboard
        // TODO: Implement leaderboard based on challenge type and user progress
        return new ChallengeLeaderboardDto
        {
            ChallengeId = challengeId,
            ChallengeTitle = challenge.Title,
            Entries = new List<LeaderboardEntryDto>()
        };
    }

    public async Task<IEnumerable<ChallengeDto>> GetFeaturedChallengesAsync(Guid? userId = null)
    {
        var now = DateTime.UtcNow;
        var challenges = await _context.Challenges
            .Where(c => c.IsActive && c.IsFeatured && c.StartDate <= now && c.EndDate >= now)
            .OrderBy(c => c.EndDate)
            .Take(5)
            .ToListAsync();

        return challenges.Select(c => MapToDto(c));
    }

    private static ChallengeDto MapToDto(Challenge challenge)
    {
        return new ChallengeDto
        {
            Id = challenge.Id,
            Title = challenge.Title,
            Description = challenge.Description,
            ImageUrl = challenge.ImageUrl,
            Type = challenge.Type,
            MetricName = challenge.MetricName,
            MetricUnit = challenge.MetricUnit,
            StartDate = challenge.StartDate,
            EndDate = challenge.EndDate,
            RewardDescription = challenge.RewardDescription,
            RewardImageUrl = challenge.RewardImageUrl,
            IsActive = challenge.IsActive,
            IsFeatured = challenge.IsFeatured,
            ParticipantsCount = 0, // TODO: Calculate from participation table
            UserProgress = null,
            UserRank = null
        };
    }
}
