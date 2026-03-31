using BigBoss.Core.DTOs.Users;
using BigBoss.Core.Entities;

namespace BigBoss.Core.Interfaces;

public interface IUserService
{
    Task<UserProfileDto?> GetProfileAsync(Guid userId);
    Task<UserProfileDto> UpdateProfileAsync(Guid userId, UpdateProfileRequest request);
    Task<User?> GetByIdAsync(Guid userId);
    Task<User?> GetByEmailAsync(string email);
    Task<bool> UpdateAvatarAsync(Guid userId, string avatarUrl);
    Task<bool> DeleteAccountAsync(Guid userId);
    Task<UserStatsDto> GetStatsAsync(Guid userId);
    Task<UserProfileDto> CompleteOnboardingAsync(Guid userId, OnboardingRequest request);
}
