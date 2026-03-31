namespace BigBoss.Core.DTOs.Auth;

public record AuthResponse(
    string AccessToken,
    string RefreshToken,
    DateTime ExpiresAt,
    UserBasicDto User
);

public record UserBasicDto(
    Guid Id,
    string Email,
    string Name,
    string? AvatarUrl,
    string SubscriptionTier
);
