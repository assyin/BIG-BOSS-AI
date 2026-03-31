using BigBoss.Core.DTOs.ProgressPhotos;

namespace BigBoss.Core.Interfaces;

public interface IProgressPhotoService
{
    Task<IEnumerable<ProgressPhotoDto>> GetByUserIdAsync(Guid userId);
    Task<ProgressPhotoDto?> GetByIdAsync(Guid id, Guid userId);
    Task<ProgressPhotoDto> CreateAsync(Guid userId, CreateProgressPhotoDto dto);
    Task<ProgressPhotoDto?> UpdateAsync(Guid id, Guid userId, UpdateProgressPhotoDto dto);
    Task<bool> DeleteAsync(Guid id, Guid userId);
}
