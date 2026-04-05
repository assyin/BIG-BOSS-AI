using BigBoss.Core.DTOs.Auth;
using BigBoss.Core.Entities;
using BigBoss.Core.Interfaces;
using BigBoss.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BigBoss.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly BigBossDbContext _context;
    private readonly ITokenService _tokenService;
    private readonly IAffiliationService _affiliationService;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        BigBossDbContext context,
        ITokenService tokenService,
        IAffiliationService affiliationService,
        ILogger<AuthService> logger)
    {
        _context = context;
        _tokenService = tokenService;
        _affiliationService = affiliationService;
        _logger = logger;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        // Check if email already exists
        if (await _context.Users.AnyAsync(u => u.Email == request.Email.ToLower()))
        {
            throw new InvalidOperationException("Un compte avec cet email existe deja");
        }

        // Create user
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = request.Email.ToLower(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Name = request.Name,
            Phone = request.Phone,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // Generate tokens
        var accessToken = _tokenService.GenerateAccessToken(user);
        var refreshToken = _tokenService.GenerateRefreshToken();

        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiresAt = _tokenService.GetRefreshTokenExpiry();

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        _logger.LogInformation("User registered: {Email}", user.Email);

        // Process referral code if provided
        if (!string.IsNullOrWhiteSpace(request.ReferralCode))
        {
            try
            {
                await _affiliationService.ProcessReferralAsync(user.Id, request.ReferralCode);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to process referral code {Code} for user {Email}", request.ReferralCode, user.Email);
            }
        }

        return new AuthResponse(
            AccessToken: accessToken,
            RefreshToken: refreshToken,
            ExpiresAt: _tokenService.GetAccessTokenExpiry(),
            User: new UserBasicDto(
                user.Id,
                user.Email,
                user.Name,
                user.AvatarUrl,
                user.SubscriptionTier.ToString()
            )
        );
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == request.Email.ToLower());

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            throw new UnauthorizedAccessException("Email ou mot de passe incorrect");
        }

        // Generate new tokens
        var accessToken = _tokenService.GenerateAccessToken(user);
        var refreshToken = _tokenService.GenerateRefreshToken();

        // Update user
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiresAt = _tokenService.GetRefreshTokenExpiry();
        user.LastLoginAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("User logged in: {Email}", user.Email);

        return new AuthResponse(
            AccessToken: accessToken,
            RefreshToken: refreshToken,
            ExpiresAt: _tokenService.GetAccessTokenExpiry(),
            User: new UserBasicDto(
                user.Id,
                user.Email,
                user.Name,
                user.AvatarUrl,
                user.SubscriptionTier.ToString()
            )
        );
    }

    public async Task<AuthResponse> RefreshTokenAsync(string refreshToken)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.RefreshToken == refreshToken);

        if (user == null || user.RefreshTokenExpiresAt < DateTime.UtcNow)
        {
            throw new UnauthorizedAccessException("Refresh token invalide ou expire");
        }

        // Generate new tokens
        var newAccessToken = _tokenService.GenerateAccessToken(user);
        var newRefreshToken = _tokenService.GenerateRefreshToken();

        // Update user
        user.RefreshToken = newRefreshToken;
        user.RefreshTokenExpiresAt = _tokenService.GetRefreshTokenExpiry();

        await _context.SaveChangesAsync();

        return new AuthResponse(
            AccessToken: newAccessToken,
            RefreshToken: newRefreshToken,
            ExpiresAt: _tokenService.GetAccessTokenExpiry(),
            User: new UserBasicDto(
                user.Id,
                user.Email,
                user.Name,
                user.AvatarUrl,
                user.SubscriptionTier.ToString()
            )
        );
    }

    public async Task RevokeRefreshTokenAsync(Guid userId)
    {
        var user = await _context.Users.FindAsync(userId);

        if (user != null)
        {
            user.RefreshToken = null;
            user.RefreshTokenExpiresAt = null;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Refresh token revoked for user: {UserId}", userId);
        }
    }

    public async Task<bool> ValidateEmailAsync(string email)
    {
        return !await _context.Users.AnyAsync(u => u.Email == email.ToLower());
    }

    public async Task<AuthResponse> GoogleLoginAsync(string idToken, string? referralCode = null)
    {
        // Verify Google token
        string email, name;
        try
        {
            using var httpClient = new HttpClient();
            var response = await httpClient.GetStringAsync($"https://oauth2.googleapis.com/tokeninfo?id_token={idToken}");
            var googleData = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(response);
            email = googleData.GetProperty("email").GetString()!.ToLower();
            name = googleData.TryGetProperty("name", out var n) ? n.GetString() ?? email.Split('@')[0] : email.Split('@')[0];
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException("Token Google invalide: " + ex.Message);
        }

        // Check if user exists
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (user == null)
        {
            // Create new user
            user = new User
            {
                Id = Guid.NewGuid(),
                Email = email,
                Name = name,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString()), // Random password
                CreatedAt = DateTime.UtcNow,
            };

            var accessToken = _tokenService.GenerateAccessToken(user);
            var refreshToken = _tokenService.GenerateRefreshToken();
            user.RefreshToken = refreshToken;
            user.RefreshTokenExpiresAt = _tokenService.GetRefreshTokenExpiry();

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Process referral
            if (!string.IsNullOrWhiteSpace(referralCode))
            {
                try { await _affiliationService.ProcessReferralAsync(user.Id, referralCode); }
                catch { }
            }

            _logger.LogInformation("Google user registered: {Email}", email);

            return new AuthResponse(
                AccessToken: accessToken,
                RefreshToken: refreshToken,
                ExpiresAt: _tokenService.GetAccessTokenExpiry(),
                User: new UserBasicDto(user.Id, user.Email, user.Name, user.AvatarUrl, user.SubscriptionTier.ToString())
            );
        }
        else
        {
            // Login existing user
            var accessToken = _tokenService.GenerateAccessToken(user);
            var refreshToken = _tokenService.GenerateRefreshToken();
            user.RefreshToken = refreshToken;
            user.RefreshTokenExpiresAt = _tokenService.GetRefreshTokenExpiry();
            user.LastLoginAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Google user logged in: {Email}", email);

            return new AuthResponse(
                AccessToken: accessToken,
                RefreshToken: refreshToken,
                ExpiresAt: _tokenService.GetAccessTokenExpiry(),
                User: new UserBasicDto(user.Id, user.Email, user.Name, user.AvatarUrl, user.SubscriptionTier.ToString())
            );
        }
    }
}
