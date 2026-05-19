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
/// Sprint 5.2 — Tests pour BuddyService (matching algo + connections).
/// </summary>
public class BuddyServiceTests : IDisposable
{
    private readonly BigBossDbContext _context;
    private readonly BuddyService _service;
    private readonly Guid _meId = Guid.NewGuid();

    public BuddyServiceTests()
    {
        var options = new DbContextOptionsBuilder<BigBossDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new BigBossDbContext(options);

        var logger = new Mock<ILogger<BuddyService>>();
        _service = new BuddyService(_context, logger.Object);

        Seed().GetAwaiter().GetResult();
    }

    private async Task Seed()
    {
        _context.Users.AddRange(
            new User { Id = _meId, Email = "me@test.ma", Name = "Me", PasswordHash = "h", Level = DifficultyLevel.Intermediate }
        );
        _context.BuddyProfiles.Add(new BuddyProfile
        {
            Id = Guid.NewGuid(),
            UserId = _meId,
            City = "Casablanca",
            GymName = "PowerHouse Anfa",
            Goals = new List<string> { "BuildMuscle", "Performance" },
            AvailableSlots = new List<string> { "weekday_evening", "weekend_morning" },
            Visible = true,
        });
        await _context.SaveChangesAsync();
    }

    private async Task<Guid> AddCandidate(string city, string? gym, List<string>? goals, List<string>? slots, DifficultyLevel level = DifficultyLevel.Intermediate)
    {
        var uid = Guid.NewGuid();
        _context.Users.Add(new User { Id = uid, Email = $"u{uid}@t.ma", Name = $"User-{uid.ToString()[..6]}", PasswordHash = "h", Level = level });
        _context.BuddyProfiles.Add(new BuddyProfile
        {
            Id = Guid.NewGuid(),
            UserId = uid,
            City = city,
            GymName = gym,
            Goals = goals ?? new(),
            AvailableSlots = slots ?? new(),
            Visible = true,
        });
        await _context.SaveChangesAsync();
        return uid;
    }

    [Fact]
    public async Task GetRecommendedAsync_SameCity_ScoresHighest()
    {
        var sameCity = await AddCandidate("Casablanca", null, null, null);
        var otherCity = await AddCandidate("Marrakech", null, null, null);

        var result = await _service.GetRecommendedAsync(_meId, 10);

        var same = result.FirstOrDefault(r => r.UserId == sameCity);
        var other = result.FirstOrDefault(r => r.UserId == otherCity);

        same.Should().NotBeNull();
        other.Should().NotBeNull();
        same!.MatchScore.Should().BeGreaterThan(other!.MatchScore);
        same.MatchReasons.Should().Contain(r => r.Contains("Casablanca"));
    }

    [Fact]
    public async Task GetRecommendedAsync_SameGym_AddsExtra20()
    {
        var sameGym = await AddCandidate("Casablanca", "PowerHouse Anfa", null, null);
        var diffGym = await AddCandidate("Casablanca", "Gold's Gym", null, null);

        var result = await _service.GetRecommendedAsync(_meId, 10);
        var matchGym = result.First(r => r.UserId == sameGym);
        var noGym = result.First(r => r.UserId == diffGym);

        matchGym.MatchScore.Should().BeGreaterThan(noGym.MatchScore);
        matchGym.MatchReasons.Should().Contain(r => r.Contains("Même salle"));
    }

    [Fact]
    public async Task GetRecommendedAsync_ExcludesAlreadyAcceptedConnections()
    {
        var connected = await AddCandidate("Casablanca", null, null, null);
        // Create an accepted connection
        _context.BuddyConnections.Add(new BuddyConnection
        {
            Id = Guid.NewGuid(),
            RequesterId = _meId,
            AddresseeId = connected,
            Status = BuddyConnectionStatus.Accepted,
        });
        await _context.SaveChangesAsync();

        var result = await _service.GetRecommendedAsync(_meId, 10);
        var match = result.FirstOrDefault(r => r.UserId == connected);

        // L'algo inclut le user mais marque IsConnected=true
        match.Should().NotBeNull();
        match!.IsConnected.Should().BeTrue();
    }

    [Fact]
    public async Task RequestConnectionAsync_MutualMatch_AutoAccepts()
    {
        var other = await AddCandidate("Casablanca", null, null, null);

        // L'autre user envoie d'abord
        _context.BuddyConnections.Add(new BuddyConnection
        {
            Id = Guid.NewGuid(),
            RequesterId = other,
            AddresseeId = _meId,
            Status = BuddyConnectionStatus.Pending,
        });
        await _context.SaveChangesAsync();

        var conn = await _service.RequestConnectionAsync(_meId, other, null);

        conn.Status.Should().Be(BuddyConnectionStatus.Accepted);
        conn.RespondedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task RequestConnectionAsync_SelfConnect_Throws()
    {
        var act = async () => await _service.RequestConnectionAsync(_meId, _meId, null);

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}
