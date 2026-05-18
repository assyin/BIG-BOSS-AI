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

/// <summary>
/// Sprint 3.2 — Tests pour idempotence offline log sets via ClientUuid.
/// </summary>
public class SessionServiceOfflineTests : IDisposable
{
    private readonly BigBossDbContext _context;
    private readonly SessionService _service;
    private readonly Guid _userId = Guid.NewGuid();
    private readonly Guid _sessionId = Guid.NewGuid();
    private readonly Guid _sessionExerciseId = Guid.NewGuid();
    private readonly Guid _exerciseId = Guid.NewGuid();

    public SessionServiceOfflineTests()
    {
        var options = new DbContextOptionsBuilder<BigBossDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new BigBossDbContext(options);

        // Tous les services tiers sont mockés — LogSetAsync n'en utilise aucun.
        var claudeMock = new Mock<IClaudeService>();
        // OpenAIService est une classe concrète : on l'instancie réellement avec un HttpClient fake
        var configMock = new Mock<IConfiguration>();
        var openAiService = new OpenAIService(new HttpClient(), configMock.Object, Mock.Of<ILogger<OpenAIService>>());
        var userMock = new Mock<IUserService>();
        var pointsMock = new Mock<IPointsService>();
        var streakMock = new Mock<IStreakService>();
        var gamifMock = new Mock<IGamificationConfigService>();
        var challengeMock = new Mock<IChallengeParticipationService>();
        var achievementMock = new Mock<IAchievementService>();
        var affMock = new Mock<IAffiliationService>();
        var feedMock = new Mock<IFeedService>();
        var logger = new Mock<ILogger<SessionService>>();

        _service = new SessionService(
            _context, claudeMock.Object, openAiService, userMock.Object,
            pointsMock.Object, streakMock.Object, gamifMock.Object,
            challengeMock.Object, achievementMock.Object, affMock.Object,
            feedMock.Object, logger.Object);

        SeedData().GetAwaiter().GetResult();
    }

    private async Task SeedData()
    {
        var user = new User
        {
            Id = _userId, Email = "tester@bbf.ma", Name = "Tester",
            PasswordHash = "hash", NotificationsEnabled = true,
        };
        var exercise = new Exercise
        {
            Id = _exerciseId, NameFr = "Squat",
            PrimaryMuscle = MuscleGroup.Quadriceps,
        };
        var session = new Session
        {
            Id = _sessionId, UserId = _userId, Title = "Test session",
            Status = SessionStatus.InProgress, GeneratedAt = DateTime.UtcNow,
        };
        var se = new SessionExercise
        {
            Id = _sessionExerciseId, SessionId = _sessionId, ExerciseId = _exerciseId,
            SetsPlanned = 4, RepsPlanned = 10,
        };
        _context.Users.Add(user);
        _context.Exercises.Add(exercise);
        _context.Sessions.Add(session);
        _context.SessionExercises.Add(se);
        await _context.SaveChangesAsync();
    }

    [Fact]
    public async Task LogSet_NewClientUuid_AppendsSet()
    {
        var uuid = Guid.NewGuid();
        var req = new LogSetRequest(_sessionExerciseId, Reps: 10, WeightKg: 60, ClientUuid: uuid);

        await _service.LogSetAsync(_userId, req);

        var se = await _context.SessionExercises.AsNoTracking().FirstAsync(s => s.Id == _sessionExerciseId);
        se.SetsCompleted.Should().Be(1);
        se.RepsCompleted.Should().ContainSingle().Which.Should().Be(10);
        se.ProcessedClientUuids.Should().Contain(uuid.ToString());
    }

    [Fact]
    public async Task LogSet_DuplicateClientUuid_IsNoOp()
    {
        var uuid = Guid.NewGuid();
        var req = new LogSetRequest(_sessionExerciseId, Reps: 10, WeightKg: 60, ClientUuid: uuid);

        await _service.LogSetAsync(_userId, req);
        await _service.LogSetAsync(_userId, req); // replay

        var se = await _context.SessionExercises.AsNoTracking().FirstAsync(s => s.Id == _sessionExerciseId);
        se.SetsCompleted.Should().Be(1, "le replay ne doit pas ajouter un 2e set");
        se.RepsCompleted.Should().HaveCount(1);
        se.ProcessedClientUuids.Count(u => u == uuid.ToString()).Should().Be(1);
    }

    [Fact]
    public async Task LogSet_WithoutClientUuid_AlwaysAppends()
    {
        var req = new LogSetRequest(_sessionExerciseId, Reps: 8, WeightKg: 50);

        await _service.LogSetAsync(_userId, req);
        await _service.LogSetAsync(_userId, req);

        var se = await _context.SessionExercises.AsNoTracking().FirstAsync(s => s.Id == _sessionExerciseId);
        se.SetsCompleted.Should().Be(2, "sans clientUuid, chaque appel ajoute un set");
        se.ProcessedClientUuids.Should().BeEmpty();
    }

    [Fact]
    public async Task LogSet_DifferentClientUuids_AppendsEach()
    {
        var u1 = Guid.NewGuid();
        var u2 = Guid.NewGuid();
        await _service.LogSetAsync(_userId, new LogSetRequest(_sessionExerciseId, 10, 60, ClientUuid: u1));
        await _service.LogSetAsync(_userId, new LogSetRequest(_sessionExerciseId, 12, 60, ClientUuid: u2));

        var se = await _context.SessionExercises.AsNoTracking().FirstAsync(s => s.Id == _sessionExerciseId);
        se.SetsCompleted.Should().Be(2);
        se.ProcessedClientUuids.Should().HaveCount(2).And.Contain(new[] { u1.ToString(), u2.ToString() });
    }

    [Fact]
    public async Task LogSet_ProcessedClientUuids_BoundedTo100()
    {
        for (int i = 0; i < 105; i++)
        {
            await _service.LogSetAsync(_userId,
                new LogSetRequest(_sessionExerciseId, 1, 1, ClientUuid: Guid.NewGuid()));
        }

        var se = await _context.SessionExercises.AsNoTracking().FirstAsync(s => s.Id == _sessionExerciseId);
        se.ProcessedClientUuids.Count.Should().BeLessThanOrEqualTo(100, "la liste doit être bornée à 100");
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}
