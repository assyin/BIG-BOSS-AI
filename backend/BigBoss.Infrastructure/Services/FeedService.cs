using BigBoss.Core.Entities;
using BigBoss.Core.Interfaces;
using BigBoss.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BigBoss.Infrastructure.Services;

public class FeedService : IFeedService
{
    private readonly BigBossDbContext _context;
    private readonly IClaudeService _claude;
    private readonly ILogger<FeedService> _logger;

    public FeedService(BigBossDbContext context, IClaudeService claude, ILogger<FeedService> logger)
    {
        _context = context;
        _claude = claude;
        _logger = logger;
    }

    public async Task<List<FeedPostDto>> GetFeedAsync(int page = 1, int pageSize = 20)
    {
        var posts = await _context.Posts.AsNoTracking()
            .Where(p => p.IsActive && !p.IsFlagged)
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Include(p => p.User)
            .Include(p => p.Reactions)
            .ToListAsync();

        var postIds = posts.Select(p => p.Id).ToList();
        var commentCounts = await _context.PostComments
            .Where(c => postIds.Contains(c.PostId) && !c.IsFlagged)
            .GroupBy(c => c.PostId)
            .Select(g => new { PostId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.PostId, g => g.Count);

        return posts.Select(p => MapToDto(p, commentCounts.GetValueOrDefault(p.Id, 0), null)).ToList();
    }

    public async Task<FeedPostDto?> GetPostAsync(Guid postId)
    {
        var post = await _context.Posts.AsNoTracking()
            .Include(p => p.User)
            .Include(p => p.Reactions)
            .FirstOrDefaultAsync(p => p.Id == postId && p.IsActive);

        if (post == null) return null;

        var commentCount = await _context.PostComments.CountAsync(c => c.PostId == postId && !c.IsFlagged);
        return MapToDto(post, commentCount, null);
    }

    public async Task<Post> CreatePostAsync(Guid userId, CreatePostRequest request)
    {
        // Sprint 5.1 — Modération IA Claude (fail-open : si Claude indispo, on publie)
        var moderation = await _claude.ScoreToxicityAsync(request.Content);

        var post = new Post
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Type = PostType.Manual,
            Content = request.Content,
            ImageUrl = request.ImageUrl,
            CreatedAt = DateTime.UtcNow,
            IsFlagged = moderation.ShouldFlag,
            FlagReason = moderation.ShouldFlag
                ? $"[AI-modération] {moderation.Category ?? "toxic"} (score={moderation.ToxicityScore:F2}): {moderation.Reason}"
                : null,
        };
        _context.Posts.Add(post);
        await _context.SaveChangesAsync();

        if (moderation.ShouldFlag)
        {
            _logger.LogWarning("Post flagged by AI: user={UserId} score={Score} category={Cat}",
                userId, moderation.ToxicityScore, moderation.Category);
        }
        else
        {
            _logger.LogInformation("Post created by user {UserId} (toxicity score: {Score:F2})",
                userId, moderation.ToxicityScore);
        }
        return post;
    }

    public async Task<Post> CreateAutoPostAsync(Guid userId, PostType type, string title, string? stats, Guid? relatedEntityId = null, string? relatedEntityType = null)
    {
        var post = new Post
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Type = type,
            Content = title,
            AutoTitle = title,
            AutoStats = stats,
            RelatedEntityId = relatedEntityId,
            RelatedEntityType = relatedEntityType,
            CreatedAt = DateTime.UtcNow,
        };
        _context.Posts.Add(post);
        await _context.SaveChangesAsync();
        return post;
    }

    public async Task<bool> ReactAsync(Guid userId, Guid postId, ReactionType type)
    {
        // Remove existing reaction from this user on this post
        var existing = await _context.PostReactions
            .FirstOrDefaultAsync(r => r.PostId == postId && r.UserId == userId);

        if (existing != null)
        {
            if (existing.Type == type)
            {
                // Toggle off
                _context.PostReactions.Remove(existing);
                await _context.SaveChangesAsync();
                return false;
            }
            // Change reaction type
            existing.Type = type;
            existing.CreatedAt = DateTime.UtcNow;
        }
        else
        {
            _context.PostReactions.Add(new PostReaction
            {
                Id = Guid.NewGuid(),
                PostId = postId,
                UserId = userId,
                Type = type,
                CreatedAt = DateTime.UtcNow,
            });
        }

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<PostComment> CommentAsync(Guid userId, Guid postId, string content)
    {
        // Sprint 5.1 — Modération IA Claude sur commentaires aussi
        var moderation = await _claude.ScoreToxicityAsync(content);

        var comment = new PostComment
        {
            Id = Guid.NewGuid(),
            PostId = postId,
            UserId = userId,
            Content = content,
            IsFlagged = moderation.ShouldFlag,
            CreatedAt = DateTime.UtcNow,
        };
        _context.PostComments.Add(comment);
        await _context.SaveChangesAsync();
        return comment;
    }

    public async Task<List<PostComment>> GetCommentsAsync(Guid postId, int page = 1, int pageSize = 30)
    {
        return await _context.PostComments.AsNoTracking()
            .Include(c => c.User)
            .Where(c => c.PostId == postId && !c.IsFlagged)
            .OrderBy(c => c.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task<bool> FlagPostAsync(Guid postId, string reason)
    {
        var post = await _context.Posts.FindAsync(postId);
        if (post == null) return false;
        post.IsFlagged = true;
        post.FlagReason = reason;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeletePostAsync(Guid postId, Guid userId)
    {
        var post = await _context.Posts.FirstOrDefaultAsync(p => p.Id == postId && p.UserId == userId);
        if (post == null) return false;
        post.IsActive = false;
        await _context.SaveChangesAsync();
        return true;
    }

    private static FeedPostDto MapToDto(Post post, int commentCount, ReactionType? myReaction)
    {
        return new FeedPostDto
        {
            Id = post.Id,
            UserId = post.UserId,
            UserName = post.User?.Name ?? "Utilisateur",
            PostType = (int)post.Type,
            Content = post.Content,
            ImageUrl = post.ImageUrl,
            AutoTitle = post.AutoTitle,
            AutoStats = post.AutoStats,
            CreatedAt = post.CreatedAt,
            FireCount = post.Reactions.Count(r => r.Type == ReactionType.Fire),
            MuscleCount = post.Reactions.Count(r => r.Type == ReactionType.Muscle),
            LightningCount = post.Reactions.Count(r => r.Type == ReactionType.Lightning),
            TrophyCount = post.Reactions.Count(r => r.Type == ReactionType.Trophy),
            CommentCount = commentCount,
            MyReaction = myReaction,
        };
    }
}
