namespace BigBoss.Core.DTOs.Coach;

public record CoachMessageResponse(
    string Message,
    string? AudioUrl,
    CoachMessageMetadata Metadata
);

public record CoachMessageMetadata(
    string ModelUsed,
    int TokensUsed,
    int LatencyMs,
    string? DetectedIntent,
    List<string>? SuggestedActions
);

public record ConversationHistoryDto(
    List<ConversationMessageDto> Messages,
    int TotalMessages,
    bool HasMore
);

public record ConversationMessageDto(
    Guid Id,
    string Role,
    string Content,
    string? ImageUrl,
    string? AudioUrl,
    DateTime CreatedAt
);
