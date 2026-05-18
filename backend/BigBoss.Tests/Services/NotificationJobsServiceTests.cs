using BigBoss.API.Jobs;
using BigBoss.Core.Entities;
using BigBoss.Core.Enums;
using BigBoss.Infrastructure.Data;
using BigBoss.Infrastructure.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace BigBoss.Tests.Services;

/// <summary>
/// Sprint 3.1 — Tests pour NotificationJobsService.
/// Vérifie le filtrage des users + idempotence + templates FR/Darija/AR.
/// </summary>
public class NotificationJobsServiceTests : IDisposable
{
    private readonly BigBossDbContext _context;
    private readonly Mock<IPushNotificationService> _pushMock;
    private readonly NotificationJobsService _service;

    public NotificationJobsServiceTests()
    {
        var options = new DbContextOptionsBuilder<BigBossDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new BigBossDbContext(options);

        _pushMock = new Mock<IPushNotificationService>();
        var logger = new Mock<ILogger<NotificationJobsService>>();
        _service = new NotificationJobsService(_context, _pushMock.Object, logger.Object);
    }

    private User CreateUser(
        string email = "test@test.com",
        string lang = "fr",
        bool notif = true,
        bool suspended = false,
        string? pushToken = "ExpoPushToken[xxx]",
        int streak = 0,
        DateTime? lastActivity = null)
    {
        return new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            Name = "Test",
            PasswordHash = "hash",
            PreferredLanguage = lang,
            NotificationsEnabled = notif,
            IsSuspended = suspended,
            PushToken = pushToken,
            CurrentStreak = streak,
            LastActivityDate = lastActivity,
        };
    }

    // ─── WorkoutReminders ──────────────────────────────────────

    [Fact]
    public async Task WorkoutReminders_FiltersInactiveUsers_SendsOnlyToOver24h()
    {
        // Arrange — 1 user active il y a 2j (inactif → push), 1 user active il y a 2h (skip)
        var inactive = CreateUser("inactive@test.com", lastActivity: DateTime.UtcNow.AddDays(-2));
        var active = CreateUser("active@test.com", lastActivity: DateTime.UtcNow.AddHours(-2));
        _context.Users.AddRange(inactive, active);
        await _context.SaveChangesAsync();

        // Act
        await _service.SendWorkoutRemindersAsync();

        // Assert — push uniquement à inactive
        _pushMock.Verify(p => p.SendToUserAsync(inactive.Id, It.IsAny<string>(), It.IsAny<string>(), It.IsAny<object>()), Times.Once);
        _pushMock.Verify(p => p.SendToUserAsync(active.Id, It.IsAny<string>(), It.IsAny<string>(), It.IsAny<object>()), Times.Never);
    }

    [Fact]
    public async Task WorkoutReminders_SkipsSuspendedUsers()
    {
        var suspended = CreateUser("susp@test.com", suspended: true, lastActivity: DateTime.UtcNow.AddDays(-5));
        _context.Users.Add(suspended);
        await _context.SaveChangesAsync();

        await _service.SendWorkoutRemindersAsync();

        _pushMock.Verify(p => p.SendToUserAsync(suspended.Id, It.IsAny<string>(), It.IsAny<string>(), It.IsAny<object>()), Times.Never);
    }

    [Fact]
    public async Task WorkoutReminders_SkipsUsersWithoutToken()
    {
        var noToken = CreateUser("notok@test.com", pushToken: null, lastActivity: DateTime.UtcNow.AddDays(-3));
        _context.Users.Add(noToken);
        await _context.SaveChangesAsync();

        await _service.SendWorkoutRemindersAsync();

        _pushMock.Verify(p => p.SendToUserAsync(noToken.Id, It.IsAny<string>(), It.IsAny<string>(), It.IsAny<object>()), Times.Never);
    }

    [Fact]
    public async Task WorkoutReminders_SkipsUsersWithNotificationsDisabled()
    {
        var disabled = CreateUser("dis@test.com", notif: false, lastActivity: DateTime.UtcNow.AddDays(-3));
        _context.Users.Add(disabled);
        await _context.SaveChangesAsync();

        await _service.SendWorkoutRemindersAsync();

        _pushMock.Verify(p => p.SendToUserAsync(disabled.Id, It.IsAny<string>(), It.IsAny<string>(), It.IsAny<object>()), Times.Never);
    }

    // ─── StreakReminders ───────────────────────────────────────

    [Fact]
    public async Task StreakReminders_OnlyUsersWithStreak()
    {
        var withStreak = CreateUser("streak@test.com", streak: 7, lastActivity: DateTime.UtcNow.AddDays(-2));
        var noStreak = CreateUser("nostreak@test.com", streak: 0, lastActivity: DateTime.UtcNow.AddDays(-2));
        _context.Users.AddRange(withStreak, noStreak);
        await _context.SaveChangesAsync();

        await _service.SendStreakRemindersAsync();

        _pushMock.Verify(p => p.SendToUserAsync(withStreak.Id, It.IsAny<string>(), It.IsAny<string>(), It.IsAny<object>()), Times.Once);
        _pushMock.Verify(p => p.SendToUserAsync(noStreak.Id, It.IsAny<string>(), It.IsAny<string>(), It.IsAny<object>()), Times.Never);
    }

    [Fact]
    public async Task StreakReminders_SkipsUsersActiveToday()
    {
        var activeToday = CreateUser("today@test.com", streak: 3, lastActivity: DateTime.UtcNow);
        _context.Users.Add(activeToday);
        await _context.SaveChangesAsync();

        await _service.SendStreakRemindersAsync();

        _pushMock.Verify(p => p.SendToUserAsync(activeToday.Id, It.IsAny<string>(), It.IsAny<string>(), It.IsAny<object>()), Times.Never);
    }

    // ─── Templates ─────────────────────────────────────────────

    [Fact]
    public async Task WorkoutReminders_DarijaUser_SendsDarijaTemplate()
    {
        var darija = CreateUser("dar@test.com", lang: "darija", lastActivity: DateTime.UtcNow.AddDays(-2));
        _context.Users.Add(darija);
        await _context.SaveChangesAsync();

        string? capturedTitle = null;
        _pushMock.Setup(p => p.SendToUserAsync(darija.Id, It.IsAny<string>(), It.IsAny<string>(), It.IsAny<object>()))
            .Callback<Guid, string, string, object?>((_, title, _, _) => capturedTitle = title);

        await _service.SendWorkoutRemindersAsync();

        capturedTitle.Should().Contain("يلا"); // début du titre darija "يلا الصالة"
    }

    [Fact]
    public async Task WorkoutReminders_FrenchUser_SendsFrenchTemplate()
    {
        var fr = CreateUser("fr@test.com", lang: "fr", lastActivity: DateTime.UtcNow.AddDays(-2));
        _context.Users.Add(fr);
        await _context.SaveChangesAsync();

        string? capturedTitle = null;
        _pushMock.Setup(p => p.SendToUserAsync(fr.Id, It.IsAny<string>(), It.IsAny<string>(), It.IsAny<object>()))
            .Callback<Guid, string, string, object?>((_, title, _, _) => capturedTitle = title);

        await _service.SendWorkoutRemindersAsync();

        capturedTitle.Should().Contain("Yallah");
    }

    [Fact]
    public async Task WorkoutReminders_ArabicUser_SendsArabicTemplate()
    {
        var ar = CreateUser("ar@test.com", lang: "ar", lastActivity: DateTime.UtcNow.AddDays(-2));
        _context.Users.Add(ar);
        await _context.SaveChangesAsync();

        string? capturedTitle = null;
        _pushMock.Setup(p => p.SendToUserAsync(ar.Id, It.IsAny<string>(), It.IsAny<string>(), It.IsAny<object>()))
            .Callback<Guid, string, string, object?>((_, title, _, _) => capturedTitle = title);

        await _service.SendWorkoutRemindersAsync();

        capturedTitle.Should().Contain("حان وقت التمرين");
    }

    // ─── WeeklyRecap ───────────────────────────────────────────

    [Fact]
    public async Task WeeklyRecap_SkipsUsersWithoutSessionsThisWeek()
    {
        var user = CreateUser("recap@test.com");
        _context.Users.Add(user);
        // Aucune session pour cette semaine
        await _context.SaveChangesAsync();

        await _service.SendWeeklyRecapAsync();

        _pushMock.Verify(p => p.SendToUserAsync(user.Id, It.IsAny<string>(), It.IsAny<string>(), It.IsAny<object>()), Times.Never);
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}
