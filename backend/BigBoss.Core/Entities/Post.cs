namespace BigBoss.Core.Entities;

public class Post
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public PostType Type { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }

    // Auto-generated data from session/achievement
    public Guid? RelatedEntityId { get; set; }
    public string? RelatedEntityType { get; set; } // "Session", "Achievement", "Challenge", "PR"
    public string? AutoTitle { get; set; } // "Chest Day termine!"
    public string? AutoStats { get; set; } // "45min · 2500kg · 5 exercices"

    public bool IsActive { get; set; } = true;
    public bool IsFlagged { get; set; }
    public string? FlagReason { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public virtual User User { get; set; } = null!;
    public virtual ICollection<PostReaction> Reactions { get; set; } = new List<PostReaction>();
    public virtual ICollection<PostComment> Comments { get; set; } = new List<PostComment>();
}

public class PostReaction
{
    public Guid Id { get; set; }
    public Guid PostId { get; set; }
    public Guid UserId { get; set; }
    public ReactionType Type { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public virtual Post Post { get; set; } = null!;
    public virtual User User { get; set; } = null!;
}

public class PostComment
{
    public Guid Id { get; set; }
    public Guid PostId { get; set; }
    public Guid UserId { get; set; }
    public string Content { get; set; } = string.Empty;
    public bool IsFlagged { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public virtual Post Post { get; set; } = null!;
    public virtual User User { get; set; } = null!;
}

public enum PostType
{
    SessionComplete = 1,
    PRBeat = 2,
    AchievementUnlocked = 3,
    ChallengeJoined = 4,
    ChallengeCompleted = 5,
    ProgressPhoto = 6,
    Manual = 10,
}

public enum ReactionType
{
    Fire = 1,     // 🔥
    Muscle = 2,   // 💪
    Lightning = 3, // ⚡
    Trophy = 4,   // 🏆
}
