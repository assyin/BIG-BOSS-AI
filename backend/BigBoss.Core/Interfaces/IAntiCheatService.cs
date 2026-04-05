namespace BigBoss.Core.Interfaces;

public interface IAntiCheatService
{
    Task<bool> ValidateSessionForPointsAsync(Guid userId, Guid sessionId);
    Task FlagUserAsync(Guid userId, string reason, string source);
    Task<List<FlaggedUser>> GetFlaggedUsersAsync(string? status = null);
    Task ResolveFlag(Guid userId, string resolution, Guid adminId); // "innocent", "disqualify", "ban"
}

public class FlaggedUser
{
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public List<FlagEntry> Flags { get; set; } = new();
    public int SuspicionScore { get; set; }
    public bool IsSuspended { get; set; }
}

public class FlagEntry
{
    public string Reason { get; set; } = string.Empty;
    public string Source { get; set; } = string.Empty; // "session", "affiliation", "points"
    public DateTime CreatedAt { get; set; }
}
