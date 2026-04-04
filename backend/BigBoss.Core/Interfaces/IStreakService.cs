namespace BigBoss.Core.Interfaces;

public interface IStreakService
{
    Task RecordActivityAsync(Guid userId);
    Task<StreakInfo> GetStreakAsync(Guid userId);
    Task<List<DateTime>> GetActivityCalendarAsync(Guid userId, int year, int month);
}

public class StreakInfo
{
    public int CurrentStreak { get; set; }
    public int LongestStreak { get; set; }
    public DateTime? LastActivityDate { get; set; }
    public bool IsActiveToday { get; set; }
}
