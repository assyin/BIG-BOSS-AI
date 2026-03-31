using BigBoss.Core.DTOs.Lives;

namespace BigBoss.Core.Interfaces;

public interface ILiveService
{
    Task<IEnumerable<LiveListDto>> GetAllAsync();
    Task<IEnumerable<LiveListDto>> GetUpcomingAsync(int count = 10);
    Task<LiveDto?> GetByIdAsync(Guid id);
    Task<LiveDto> CreateAsync(CreateLiveDto dto);
    Task<LiveDto?> UpdateAsync(Guid id, UpdateLiveDto dto);
    Task<bool> DeleteAsync(Guid id);
}
