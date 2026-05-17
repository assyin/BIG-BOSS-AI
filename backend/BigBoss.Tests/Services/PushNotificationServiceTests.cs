using BigBoss.Core.Entities;
using BigBoss.Infrastructure.Data;
using BigBoss.Infrastructure.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace BigBoss.Tests.Services;

/// <summary>
/// Sprint 1.2 — FCM polish tests.
/// Vérifie que PushNotificationService gère correctement les tokens et le filtrage users.
/// </summary>
public class PushNotificationServiceTests : IDisposable
{
    private readonly BigBossDbContext _context;
    private readonly PushNotificationService _service;

    public PushNotificationServiceTests()
    {
        var options = new DbContextOptionsBuilder<BigBossDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new BigBossDbContext(options);

        var logger = new Mock<ILogger<PushNotificationService>>();
        _service = new PushNotificationService(_context, logger.Object);
    }

    [Fact]
    public async Task SaveTokenAsync_ExistingUser_UpdatesPushToken()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = new User
        {
            Id = userId,
            Email = "test@test.com",
            Name = "Test User",
            PasswordHash = "hash",
            NotificationsEnabled = true,
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // Act
        await _service.SaveTokenAsync(userId, "ExponentPushToken[abc123]");

        // Assert
        var saved = await _context.Users.FindAsync(userId);
        saved!.PushToken.Should().Be("ExponentPushToken[abc123]");
    }

    [Fact]
    public async Task SaveTokenAsync_NonExistentUser_DoesNotThrow()
    {
        // Act — should not throw even if user doesn't exist
        var act = async () => await _service.SaveTokenAsync(Guid.NewGuid(), "token");

        // Assert
        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task SendToUserAsync_UserWithoutToken_DoesNothing()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = new User
        {
            Id = userId,
            Email = "notoken@test.com",
            Name = "No Token User",
            PasswordHash = "hash",
            PushToken = null, // pas de token
            NotificationsEnabled = true,
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // Act — should silently skip
        var act = async () => await _service.SendToUserAsync(userId, "Hello", "World");

        // Assert
        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task SaveTokenAsync_UpdateExistingToken_OverwritesPrevious()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = new User
        {
            Id = userId,
            Email = "test@test.com",
            Name = "Test",
            PasswordHash = "hash",
            PushToken = "old_token",
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // Act
        await _service.SaveTokenAsync(userId, "new_token");

        // Assert
        var updated = await _context.Users.FindAsync(userId);
        updated!.PushToken.Should().Be("new_token");
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}
