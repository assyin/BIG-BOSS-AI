using BigBoss.Core.DTOs.Sessions;
using BigBoss.Core.Entities;
using BigBoss.Core.Enums;
using BigBoss.Core.Interfaces;
using BigBoss.Infrastructure.Data;
using BigBoss.Infrastructure.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace BigBoss.Tests.Services;

public class SessionServiceTests : IDisposable
{
    private readonly BigBossDbContext _context;
    private readonly Mock<IClaudeService> _claudeServiceMock;
    private readonly Mock<IUserService> _userServiceMock;
    private readonly Mock<ILogger<SessionService>> _loggerMock;
    private readonly SessionService _sessionService;
    private readonly User _testUser;

    public SessionServiceTests()
    {
        var options = new DbContextOptionsBuilder<BigBossDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new BigBossDbContext(options);
        _claudeServiceMock = new Mock<IClaudeService>();
        _userServiceMock = new Mock<IUserService>();
        _loggerMock = new Mock<ILogger<SessionService>>();

        _testUser = new User
        {
            Id = Guid.NewGuid(),
            Email = "test@example.com",
            PasswordHash = "hash",
            Name = "Test User",
            Goal = UserGoal.BuildMuscle,
            Level = DifficultyLevel.Intermediate,
            WeightKg = 80
        };

        _context.Users.Add(_testUser);
        _context.SaveChanges();

        _userServiceMock.Setup(x => x.GetByIdAsync(It.IsAny<Guid>()))
            .ReturnsAsync(_testUser);

        var openAiService = new OpenAIService(
            new HttpClient(),
            new Microsoft.Extensions.Configuration.ConfigurationBuilder().Build(),
            new Mock<ILogger<OpenAIService>>().Object
        );

        _sessionService = new SessionService(
            _context,
            _claudeServiceMock.Object,
            openAiService,
            _userServiceMock.Object,
            new Mock<IPointsService>().Object,
            new Mock<IStreakService>().Object,
            new Mock<IGamificationConfigService>().Object,
            new Mock<IChallengeParticipationService>().Object,
            new Mock<IAchievementService>().Object,
            new Mock<IAffiliationService>().Object,
            _loggerMock.Object
        );
    }

    [Fact]
    public async Task GetSession_WithValidId_ShouldReturnSession()
    {
        // Arrange
        var session = new Session
        {
            Id = Guid.NewGuid(),
            UserId = _testUser.Id,
            Title = "Test Session",
            PrimaryMuscleGroup = MuscleGroup.Chest,
            PlannedDurationMinutes = 60,
            Status = SessionStatus.Generated
        };
        _context.Sessions.Add(session);
        await _context.SaveChangesAsync();

        // Act
        var result = await _sessionService.GetSessionAsync(session.Id, _testUser.Id);

        // Assert
        result.Should().NotBeNull();
        result!.Title.Should().Be("Test Session");
        result.Status.Should().Be("Generated");
    }

    [Fact]
    public async Task GetSession_WithWrongUserId_ShouldReturnNull()
    {
        // Arrange
        var session = new Session
        {
            Id = Guid.NewGuid(),
            UserId = _testUser.Id,
            Title = "Test Session",
            PrimaryMuscleGroup = MuscleGroup.Chest,
            PlannedDurationMinutes = 60
        };
        _context.Sessions.Add(session);
        await _context.SaveChangesAsync();

        // Act
        var result = await _sessionService.GetSessionAsync(session.Id, Guid.NewGuid());

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task StartSession_ShouldUpdateStatusToInProgress()
    {
        // Arrange
        var session = new Session
        {
            Id = Guid.NewGuid(),
            UserId = _testUser.Id,
            Title = "Test Session",
            PrimaryMuscleGroup = MuscleGroup.Chest,
            PlannedDurationMinutes = 60,
            Status = SessionStatus.Generated
        };
        _context.Sessions.Add(session);
        await _context.SaveChangesAsync();

        // Act
        var result = await _sessionService.StartSessionAsync(session.Id, _testUser.Id);

        // Assert
        result.Should().NotBeNull();
        result.Status.Should().Be("InProgress");

        var updatedSession = await _context.Sessions.FindAsync(session.Id);
        updatedSession!.StartedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task GetUserSessions_ShouldReturnSessionsOrderedByDate()
    {
        // Arrange
        var sessions = new List<Session>
        {
            new()
            {
                Id = Guid.NewGuid(),
                UserId = _testUser.Id,
                Title = "Session 1",
                PrimaryMuscleGroup = MuscleGroup.Chest,
                PlannedDurationMinutes = 60,
                GeneratedAt = DateTime.UtcNow.AddDays(-2)
            },
            new()
            {
                Id = Guid.NewGuid(),
                UserId = _testUser.Id,
                Title = "Session 2",
                PrimaryMuscleGroup = MuscleGroup.Back,
                PlannedDurationMinutes = 45,
                GeneratedAt = DateTime.UtcNow.AddDays(-1)
            },
            new()
            {
                Id = Guid.NewGuid(),
                UserId = _testUser.Id,
                Title = "Session 3",
                PrimaryMuscleGroup = MuscleGroup.Shoulders,
                PlannedDurationMinutes = 30,
                GeneratedAt = DateTime.UtcNow
            }
        };
        _context.Sessions.AddRange(sessions);
        await _context.SaveChangesAsync();

        // Act
        var result = await _sessionService.GetUserSessionsAsync(_testUser.Id, 1, 10);

        // Assert
        result.Should().HaveCount(3);
        result[0].Title.Should().Be("Session 3"); // Most recent first
        result[2].Title.Should().Be("Session 1"); // Oldest last
    }

    [Fact]
    public async Task LogSet_ShouldAddCompletedSetToExercise()
    {
        // Arrange
        var exercise = new Exercise
        {
            Id = Guid.NewGuid(),
            NameFr = "Developpe couche",
            PrimaryMuscle = MuscleGroup.Chest,
            Category = MuscleGroup.Chest,
            Difficulty = DifficultyLevel.Intermediate
        };
        _context.Exercises.Add(exercise);

        var session = new Session
        {
            Id = Guid.NewGuid(),
            UserId = _testUser.Id,
            Title = "Test Session",
            PrimaryMuscleGroup = MuscleGroup.Chest,
            PlannedDurationMinutes = 60,
            Status = SessionStatus.InProgress
        };
        _context.Sessions.Add(session);

        var sessionExercise = new SessionExercise
        {
            Id = Guid.NewGuid(),
            SessionId = session.Id,
            ExerciseId = exercise.Id,
            SetsPlanned = 4,
            RepsPlanned = 10,
            WeightPlannedKg = 60
        };
        _context.SessionExercises.Add(sessionExercise);
        await _context.SaveChangesAsync();

        var request = new LogSetRequest(sessionExercise.Id, 10, 60, 85, 90, null);

        // Act
        var result = await _sessionService.LogSetAsync(_testUser.Id, request);

        // Assert
        result.Should().NotBeNull();
        result.CompletedSets.Should().HaveCount(1);
        result.CompletedSets![0].Reps.Should().Be(10);
        result.CompletedSets[0].WeightKg.Should().Be(60);
    }

    [Fact]
    public async Task GetCurrentActiveSession_WithNoActiveSession_ShouldReturnNull()
    {
        // Act
        var result = await _sessionService.GetCurrentActiveSessionAsync(_testUser.Id);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetCurrentActiveSession_WithActiveSession_ShouldReturnSession()
    {
        // Arrange
        var session = new Session
        {
            Id = Guid.NewGuid(),
            UserId = _testUser.Id,
            Title = "Active Session",
            PrimaryMuscleGroup = MuscleGroup.Chest,
            PlannedDurationMinutes = 60,
            Status = SessionStatus.InProgress,
            StartedAt = DateTime.UtcNow
        };
        _context.Sessions.Add(session);
        await _context.SaveChangesAsync();

        // Act
        var result = await _sessionService.GetCurrentActiveSessionAsync(_testUser.Id);

        // Assert
        result.Should().NotBeNull();
        result!.Title.Should().Be("Active Session");
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }
}
