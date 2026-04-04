using BigBoss.Core.Entities;

namespace BigBoss.Core.Interfaces;

public interface IChallengeParticipationService
{
    Task<ChallengeParticipation> JoinChallengeAsync(Guid challengeId, Guid userId);
    Task LeaveChallengeAsync(Guid challengeId, Guid userId);
    Task<ChallengeParticipation?> GetMyProgressAsync(Guid challengeId, Guid userId);
    Task<List<LeaderboardEntry>> GetLeaderboardAsync(Guid challengeId, int top = 50);
    Task<List<ChallengeParticipation>> GetMyChallengesAsync(Guid userId);
    Task UpdateProgressFromSessionAsync(Guid userId, Guid sessionId);
    Task FinalizeChallengeAsync(Guid challengeId);
}

public class LeaderboardEntry
{
    public int Rank { get; set; }
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public decimal Progress { get; set; }
    public bool IsCompleted { get; set; }
}
