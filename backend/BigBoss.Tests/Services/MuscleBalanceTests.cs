using BigBoss.API.Controllers;
using BigBoss.Core.Entities;
using BigBoss.Core.Enums;
using BigBoss.Infrastructure.Data;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Xunit;

namespace BigBoss.Tests.Services;

/// <summary>
/// Sprint 3.4 — Tests pour MuscleBalanceController.
/// </summary>
public class MuscleBalanceTests : IDisposable
{
    private readonly BigBossDbContext _context;
    private readonly MuscleBalanceController _controller;
    private readonly Guid _userId = Guid.NewGuid();

    public MuscleBalanceTests()
    {
        var options = new DbContextOptionsBuilder<BigBossDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new BigBossDbContext(options);

        _controller = new MuscleBalanceController(_context);
        // Auth context simulé
        _controller.ControllerContext = new Microsoft.AspNetCore.Mvc.ControllerContext
        {
            HttpContext = new Microsoft.AspNetCore.Http.DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, _userId.ToString()),
                })),
            },
        };
    }

    private async Task SeedSessionWithExercise(MuscleGroup muscle, int sets, int reps, decimal weightKg)
    {
        var exId = Guid.NewGuid();
        var sId = Guid.NewGuid();
        _context.Exercises.Add(new Exercise { Id = exId, NameFr = $"Ex-{muscle}", PrimaryMuscle = muscle });
        _context.Sessions.Add(new Session
        {
            Id = sId, UserId = _userId, Title = "S", Status = SessionStatus.Completed,
            GeneratedAt = DateTime.UtcNow.AddDays(-5), CompletedAt = DateTime.UtcNow.AddDays(-5),
        });
        _context.SessionExercises.Add(new SessionExercise
        {
            Id = Guid.NewGuid(), SessionId = sId, ExerciseId = exId,
            SetsPlanned = sets, RepsPlanned = reps, SetsCompleted = sets,
            RepsCompleted = Enumerable.Repeat(reps, sets).ToList(),
            WeightsCompletedKg = Enumerable.Repeat(weightKg, sets).ToList(),
            IsCompleted = true, CompletedAt = DateTime.UtcNow.AddDays(-5),
        });
        await _context.SaveChangesAsync();
    }

    [Fact]
    public async Task Get_NoData_ReturnsAllMusclesWithZero()
    {
        var result = await _controller.Get();
        var ok = result as OkObjectResult;
        ok.Should().NotBeNull();
        var json = System.Text.Json.JsonSerializer.Serialize(ok!.Value);
        json.Should().Contain("\"muscles\"");
        json.Should().Contain("Chest");
        json.Should().Contain("Calves");
    }

    [Fact]
    public async Task Get_OneMuscleDominant_RatioOneForIt()
    {
        await SeedSessionWithExercise(MuscleGroup.Chest, sets: 5, reps: 10, weightKg: 60);

        var result = await _controller.Get(days: 30);
        var ok = result as OkObjectResult;
        var json = System.Text.Json.JsonSerializer.Serialize(ok!.Value);

        // Le muscle Chest doit avoir volumeRatio=1 (max)
        json.Should().Contain("\"muscle\":\"Chest\"");
        json.Should().Contain("\"volumeRatio\":1");
    }

    [Fact]
    public async Task Get_TotalsAggregated()
    {
        await SeedSessionWithExercise(MuscleGroup.Quadriceps, sets: 4, reps: 8, weightKg: 100);

        var result = await _controller.Get();
        var ok = result as OkObjectResult;
        var json = System.Text.Json.JsonSerializer.Serialize(ok!.Value);

        json.Should().Contain("\"totalSets\":4");
        // volume = (4 sets × 8 reps × avg(100,100,100,100)) = 4 × 8 × 100 = 3200
        json.Should().Contain("\"totalVolume\":3200");
    }

    [Fact]
    public async Task Get_FrenchLabels_Present()
    {
        await SeedSessionWithExercise(MuscleGroup.Chest, 1, 1, 1);

        var result = await _controller.Get();
        var ok = result as OkObjectResult;
        var json = System.Text.Json.JsonSerializer.Serialize(ok!.Value);

        json.Should().Contain("Pectoraux");
        json.Should().Contain("Quadri");
        json.Should().Contain("Mollets");
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}
