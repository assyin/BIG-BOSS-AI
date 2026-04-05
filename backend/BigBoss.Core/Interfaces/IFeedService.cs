using BigBoss.Core.Entities;

namespace BigBoss.Core.Interfaces;

public interface IFeedService
{
    Task<List<FeedPostDto>> GetFeedAsync(int page = 1, int pageSize = 20);
    Task<FeedPostDto?> GetPostAsync(Guid postId);
    Task<Post> CreatePostAsync(Guid userId, CreatePostRequest request);
    Task<Post> CreateAutoPostAsync(Guid userId, PostType type, string title, string? stats, Guid? relatedEntityId = null, string? relatedEntityType = null);
    Task<bool> ReactAsync(Guid userId, Guid postId, ReactionType type);
    Task<PostComment> CommentAsync(Guid userId, Guid postId, string content);
    Task<List<PostComment>> GetCommentsAsync(Guid postId, int page = 1, int pageSize = 30);
    Task<bool> FlagPostAsync(Guid postId, string reason);
    Task<bool> DeletePostAsync(Guid postId, Guid userId);
}

public class FeedPostDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string? UserAvatar { get; set; }
    public int PostType { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public string? AutoTitle { get; set; }
    public string? AutoStats { get; set; }
    public DateTime CreatedAt { get; set; }
    public int FireCount { get; set; }
    public int MuscleCount { get; set; }
    public int LightningCount { get; set; }
    public int TrophyCount { get; set; }
    public int CommentCount { get; set; }
    public ReactionType? MyReaction { get; set; }
}

public class CreatePostRequest
{
    public string Content { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
}
