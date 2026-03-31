using BigBoss.Core.DTOs.Auth;
using BigBoss.Core.Entities;
using BigBoss.Core.Interfaces;
using BigBoss.Infrastructure.Data;
using BigBoss.Infrastructure.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace BigBoss.Tests.Services;

public class AuthServiceTests : IDisposable
{
    private readonly BigBossDbContext _context;
    private readonly Mock<ITokenService> _tokenServiceMock;
    private readonly Mock<ILogger<AuthService>> _loggerMock;
    private readonly AuthService _authService;

    public AuthServiceTests()
    {
        var options = new DbContextOptionsBuilder<BigBossDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new BigBossDbContext(options);
        _tokenServiceMock = new Mock<ITokenService>();
        _loggerMock = new Mock<ILogger<AuthService>>();

        _tokenServiceMock.Setup(x => x.GenerateAccessToken(It.IsAny<User>()))
            .Returns("test-access-token");
        _tokenServiceMock.Setup(x => x.GenerateRefreshToken())
            .Returns("test-refresh-token");
        _tokenServiceMock.Setup(x => x.GetAccessTokenExpiry())
            .Returns(DateTime.UtcNow.AddMinutes(15));
        _tokenServiceMock.Setup(x => x.GetRefreshTokenExpiry())
            .Returns(DateTime.UtcNow.AddDays(30));

        _authService = new AuthService(_context, _tokenServiceMock.Object, _loggerMock.Object);
    }

    [Fact]
    public async Task Register_WithValidData_ShouldCreateUserAndReturnTokens()
    {
        // Arrange
        var request = new RegisterRequest("test@example.com", "Password123!", "Test User", null);

        // Act
        var result = await _authService.RegisterAsync(request);

        // Assert
        result.Should().NotBeNull();
        result.AccessToken.Should().Be("test-access-token");
        result.RefreshToken.Should().Be("test-refresh-token");
        result.User.Email.Should().Be("test@example.com");
        result.User.Name.Should().Be("Test User");

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == "test@example.com");
        user.Should().NotBeNull();
        user!.PasswordHash.Should().NotBe("Password123!"); // Should be hashed
    }

    [Fact]
    public async Task Register_WithExistingEmail_ShouldThrowException()
    {
        // Arrange
        var existingUser = new User
        {
            Id = Guid.NewGuid(),
            Email = "existing@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("password"),
            Name = "Existing User"
        };
        _context.Users.Add(existingUser);
        await _context.SaveChangesAsync();

        var request = new RegisterRequest("existing@example.com", "Password123!", "New User", null);

        // Act & Assert
        var act = () => _authService.RegisterAsync(request);
        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("*existe deja*");
    }

    [Fact]
    public async Task Login_WithValidCredentials_ShouldReturnTokens()
    {
        // Arrange
        var password = "Password123!";
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "login@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            Name = "Login User"
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var request = new LoginRequest("login@example.com", password);

        // Act
        var result = await _authService.LoginAsync(request);

        // Assert
        result.Should().NotBeNull();
        result.AccessToken.Should().Be("test-access-token");
        result.User.Email.Should().Be("login@example.com");
    }

    [Fact]
    public async Task Login_WithInvalidPassword_ShouldThrowUnauthorized()
    {
        // Arrange
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "login@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("correctpassword"),
            Name = "Login User"
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var request = new LoginRequest("login@example.com", "wrongpassword");

        // Act & Assert
        var act = () => _authService.LoginAsync(request);
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task Login_WithNonExistentEmail_ShouldThrowUnauthorized()
    {
        // Arrange
        var request = new LoginRequest("nonexistent@example.com", "password");

        // Act & Assert
        var act = () => _authService.LoginAsync(request);
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task RefreshToken_WithValidToken_ShouldReturnNewTokens()
    {
        // Arrange
        var refreshToken = "valid-refresh-token";
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "refresh@example.com",
            PasswordHash = "hash",
            Name = "Refresh User",
            RefreshToken = refreshToken,
            RefreshTokenExpiresAt = DateTime.UtcNow.AddDays(30)
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // Act
        var result = await _authService.RefreshTokenAsync(refreshToken);

        // Assert
        result.Should().NotBeNull();
        result.AccessToken.Should().Be("test-access-token");
    }

    [Fact]
    public async Task RefreshToken_WithExpiredToken_ShouldThrowUnauthorized()
    {
        // Arrange
        var refreshToken = "expired-refresh-token";
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "expired@example.com",
            PasswordHash = "hash",
            Name = "Expired User",
            RefreshToken = refreshToken,
            RefreshTokenExpiresAt = DateTime.UtcNow.AddDays(-1) // Expired
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // Act & Assert
        var act = () => _authService.RefreshTokenAsync(refreshToken);
        await act.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task ValidateEmail_WithNewEmail_ShouldReturnTrue()
    {
        // Act
        var result = await _authService.ValidateEmailAsync("new@example.com");

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task ValidateEmail_WithExistingEmail_ShouldReturnFalse()
    {
        // Arrange
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "existing@example.com",
            PasswordHash = "hash",
            Name = "User"
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // Act
        var result = await _authService.ValidateEmailAsync("existing@example.com");

        // Assert
        result.Should().BeFalse();
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }
}
