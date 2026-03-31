using BigBoss.Core.DTOs.Coach;

namespace BigBoss.Core.Interfaces;

public interface ICoachService
{
    Task<CoachMessageResponse> SendMessageAsync(Guid userId, CoachMessageRequest request);
    Task<ConversationHistoryDto> GetConversationHistoryAsync(Guid userId, int page = 1, int pageSize = 20);
    Task<int> GetDailyMessageCountAsync(Guid userId);
    Task<bool> CanSendMessageAsync(Guid userId);
    Task ClearConversationHistoryAsync(Guid userId);
}
