namespace BigBoss.Core.Interfaces;

public interface IClaudeService
{
    Task<ClaudeResponse> SendMessageAsync(ClaudeRequest request);
    Task<ClaudeResponse> SendMessageWithImageAsync(ClaudeRequest request, string imageBase64);
    Task<string> GenerateSessionPromptAsync(SessionGenerationContext context);
    Task<string> AnalyzeMealImageAsync(string imageBase64);
    Task<string> GenerateMotivationalMessageAsync(MotivationContext context);
}

public record ClaudeRequest(
    string SystemPrompt,
    string UserMessage,
    List<ClaudeMessage>? ConversationHistory = null,
    string Model = "claude-haiku-4-5-20251001",
    int MaxTokens = 1024
);

public record ClaudeMessage(
    string Role,
    string Content
);

public record ClaudeResponse(
    string Content,
    int InputTokens,
    int OutputTokens,
    string Model,
    int LatencyMs
);

public record SessionGenerationContext(
    Guid UserId,
    string UserGoal,
    string UserLevel,
    decimal? UserWeightKg,
    List<string> AvailableEquipment,
    List<string> RecentMuscleGroups,
    int DurationMinutes,
    int? EnergyLevel,
    int? SleepHours
);

public record MotivationContext(
    string UserName,
    int TotalSessions,
    int CurrentStreak,
    decimal? TodayVolumeKg,
    List<string>? NewPersonalRecords
);
