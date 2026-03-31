using BigBoss.Core.DTOs.Auth;

namespace BigBoss.Core.Interfaces;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request);
    Task<AuthResponse> LoginAsync(LoginRequest request);
    Task<AuthResponse> RefreshTokenAsync(string refreshToken);
    Task RevokeRefreshTokenAsync(Guid userId);
    Task<bool> ValidateEmailAsync(string email);
}
