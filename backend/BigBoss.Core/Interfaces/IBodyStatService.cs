using BigBoss.Core.DTOs.BodyStats;

namespace BigBoss.Core.Interfaces;

public interface IBodyStatService
{
    Task<IEnumerable<BodyStatDto>> GetByUserIdAsync(Guid userId);
    Task<BodyStatDto?> GetByIdAsync(Guid id, Guid userId);
    Task<BodyStatDto> CreateAsync(Guid userId, CreateBodyStatDto dto);
    Task<BodyStatDto?> UpdateAsync(Guid id, Guid userId, UpdateBodyStatDto dto);
    Task<bool> DeleteAsync(Guid id, Guid userId);
    Task<BodyStatDto?> GetLatestAsync(Guid userId);
}
