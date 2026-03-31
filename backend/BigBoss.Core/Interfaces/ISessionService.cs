using BigBoss.Core.DTOs.Sessions;
using BigBoss.Core.Entities;

namespace BigBoss.Core.Interfaces;

public interface ISessionService
{
    Task<SessionDto> GenerateSessionAsync(Guid userId, GenerateSessionRequest request);
    Task<SessionDto?> GetSessionAsync(Guid sessionId, Guid userId);
    Task<List<SessionDto>> GetUserSessionsAsync(Guid userId, int page = 1, int pageSize = 10);
    Task<SessionDto> StartSessionAsync(Guid sessionId, Guid userId);
    Task<SessionExerciseDto> LogSetAsync(Guid userId, LogSetRequest request);
    Task<SessionExerciseDto> SkipExerciseAsync(Guid userId, SkipExerciseRequest request);
    Task<SessionSummaryDto> CompleteSessionAsync(Guid sessionId, Guid userId);
    Task<SessionDto> AbandonSessionAsync(Guid sessionId, Guid userId);
    Task<Session?> GetCurrentActiveSessionAsync(Guid userId);
}
