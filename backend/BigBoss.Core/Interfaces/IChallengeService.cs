using BigBoss.Core.DTOs.Challenges;
using BigBoss.Core.Entities;

namespace BigBoss.Core.Interfaces;

public interface IChallengeService
{
    Task<IEnumerable<ChallengeDto>> GetActiveChallengesAsync(Guid? userId = null);
    Task<ChallengeDto?> GetByIdAsync(Guid id, Guid? userId = null);
    Task<ChallengeDto> CreateAsync(CreateChallengeDto dto);
    Task<ChallengeDto?> UpdateAsync(Guid id, UpdateChallengeDto dto);
    Task<bool> DeleteAsync(Guid id);
    Task<ChallengeLeaderboardDto?> GetLeaderboardAsync(Guid challengeId, int top = 10);
    Task<IEnumerable<ChallengeDto>> GetFeaturedChallengesAsync(Guid? userId = null);
}
