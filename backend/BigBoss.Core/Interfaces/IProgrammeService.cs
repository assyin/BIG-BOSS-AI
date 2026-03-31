using BigBoss.Core.Entities;

namespace BigBoss.Core.Interfaces;

public interface IProgrammeService
{
    Task<Programme> GenerateProgrammeAsync(Guid userId);
    Task<Programme?> GetActiveProgrammeAsync(Guid userId);
    Task<Programme?> GetProgrammeAsync(Guid id, Guid userId);
    Task<ProgrammeSession?> GetTodaySessionAsync(Guid programmeId, Guid userId);
    Task<List<ProgrammeSession>> GetWeekSessionsAsync(Guid programmeId, int weekNumber);
    Task<Session> StartProgrammeSessionAsync(Guid programmeId, Guid programmeSessionId, Guid userId);
    Task CompleteProgrammeSessionAsync(Guid programmeId, Guid programmeSessionId, Guid userId);
    Task PauseProgrammeAsync(Guid programmeId, Guid userId);
    Task ResumeProgrammeAsync(Guid programmeId, Guid userId);
    Task AbandonProgrammeAsync(Guid programmeId, Guid userId);
    Task UpdateMissedSessionsAsync(Guid programmeId);
    Task<object> GetProgressAsync(Guid programmeId, Guid userId);
    Task<object> GetNutritionPlanAsync(Guid programmeId);
}
