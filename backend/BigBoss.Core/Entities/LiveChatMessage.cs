namespace BigBoss.Core.Entities;

/// <summary>
/// Sprint 5.3 — Message de chat live persisté en DB.
/// Permet d'afficher l'historique lors de l'ouverture du replay
/// + audit des messages signalés/flaggués.
/// </summary>
public class LiveChatMessage
{
    public Guid Id { get; set; }
    public Guid LiveId { get; set; }
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;

    // Modération
    public bool IsFlagged { get; set; }
    public bool IsHidden { get; set; }                 // mute automatique si toxic
    public decimal? ToxicityScore { get; set; }        // 0-1, null si pas analysé
    public string? FlagReason { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public virtual Live Live { get; set; } = null!;
    public virtual User User { get; set; } = null!;
}
