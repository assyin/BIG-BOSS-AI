using BigBoss.Core.Interfaces;
using BigBoss.Infrastructure.Services;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Moq.Protected;
using System.Net;
using System.Text.Json;
using Xunit;

namespace BigBoss.Tests.Services;

public class ClaudeServiceTests
{
    private readonly Mock<ILogger<ClaudeService>> _loggerMock;
    private readonly IConfiguration _configuration;

    public ClaudeServiceTests()
    {
        _loggerMock = new Mock<ILogger<ClaudeService>>();

        var configValues = new Dictionary<string, string?>
        {
            { "BBF_CLAUDE_API_KEY", "test-api-key" },
            { "BBF_CLAUDE_MODEL_FAST", "claude-haiku-4-5-20251001" },
            { "BBF_CLAUDE_MODEL_SMART", "claude-sonnet-4-6" }
        };

        _configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(configValues)
            .Build();
    }

    [Fact]
    public async Task SendMessageAsync_WithValidRequest_ShouldReturnResponse()
    {
        // Arrange
        var responseContent = new
        {
            content = new[]
            {
                new { type = "text", text = "Voici ta seance personnalisee!" }
            },
            usage = new { input_tokens = 100, output_tokens = 50 }
        };

        var handlerMock = new Mock<HttpMessageHandler>();
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(JsonSerializer.Serialize(responseContent))
            });

        var httpClient = new HttpClient(handlerMock.Object);
        var claudeService = new ClaudeService(httpClient, _configuration, _loggerMock.Object);

        var request = new ClaudeRequest(
            SystemPrompt: "Tu es un coach fitness",
            UserMessage: "Genere une seance",
            Model: "claude-haiku-4-5-20251001",
            MaxTokens: 1000
        );

        // Act
        var result = await claudeService.SendMessageAsync(request);

        // Assert
        result.Should().NotBeNull();
        result.Content.Should().Be("Voici ta seance personnalisee!");
        result.InputTokens.Should().Be(100);
        result.OutputTokens.Should().Be(50);
    }

    [Fact]
    public async Task SendMessageAsync_WithApiError_ShouldThrowException()
    {
        // Arrange
        var handlerMock = new Mock<HttpMessageHandler>();
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.Unauthorized,
                Content = new StringContent("{\"error\": \"Invalid API key\"}")
            });

        var httpClient = new HttpClient(handlerMock.Object);
        var claudeService = new ClaudeService(httpClient, _configuration, _loggerMock.Object);

        var request = new ClaudeRequest(
            SystemPrompt: "Tu es un coach",
            UserMessage: "Test",
            Model: "claude-haiku-4-5-20251001",
            MaxTokens: 100
        );

        // Act & Assert
        var act = () => claudeService.SendMessageAsync(request);
        await act.Should().ThrowAsync<HttpRequestException>();
    }

    [Fact]
    public void SessionGenerationContext_ShouldContainAllRequiredFields()
    {
        // Arrange & Act
        var context = new SessionGenerationContext(
            UserId: Guid.NewGuid(),
            UserGoal: "BuildMuscle",
            UserLevel: "Intermediate",
            UserWeightKg: 80,
            AvailableEquipment: new List<string> { "Barbell", "Dumbbell" },
            RecentMuscleGroups: new List<string> { "Chest", "Back" },
            DurationMinutes: 60,
            EnergyLevel: 7,
            SleepHours: 8
        );

        // Assert
        context.UserGoal.Should().Be("BuildMuscle");
        context.UserLevel.Should().Be("Intermediate");
        context.UserWeightKg.Should().Be(80);
        context.AvailableEquipment.Should().Contain("Barbell");
        context.DurationMinutes.Should().Be(60);
    }

    [Fact]
    public void MotivationContext_ShouldContainUserInfo()
    {
        // Arrange & Act
        var context = new MotivationContext(
            UserName: "Champion",
            TotalSessions: 50,
            CurrentStreak: 7,
            TodayVolumeKg: 5000,
            NewPersonalRecords: new List<string> { "Squat 120kg" }
        );

        // Assert
        context.UserName.Should().Be("Champion");
        context.TotalSessions.Should().Be(50);
        context.CurrentStreak.Should().Be(7);
        context.NewPersonalRecords.Should().Contain("Squat 120kg");
    }
}
