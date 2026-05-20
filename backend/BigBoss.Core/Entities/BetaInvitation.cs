namespace BigBoss.Core.Entities;

/// <summary>
/// Sprint 6.5 — Invitation beta. Permet de tracker les inscriptions privées 500 users.
/// </summary>
public class BetaInvitation
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? Name { get; set; }
    public string? Phone { get; set; }
    public string? City { get; set; }
    public string Source { get; set; } = "landing";        // "landing" | "admin" | "referral"
    public string Status { get; set; } = "Pending";        // Pending | Invited | Accepted | Rejected
    public string? InviteCode { get; set; }                // code unique pour onboarding
    public string? AdminNotes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? InvitedAt { get; set; }
    public DateTime? AcceptedAt { get; set; }
}

/// <summary>
/// Sprint 6.5 — Feedback in-app utilisateur.
/// </summary>
public class UserFeedback
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }                       // null si anonyme (rare)
    public int Rating { get; set; }                          // 1-5 stars
    public string Category { get; set; } = "general";        // bug | feature | general | praise
    public string Content { get; set; } = string.Empty;
    public string? ScreenshotUrl { get; set; }               // optionnel, screenshot via R2
    public string? AppVersion { get; set; }
    public string? DeviceInfo { get; set; }                  // JSON: { os, model, locale }
    public string Status { get; set; } = "Open";             // Open | InProgress | Resolved | Dismissed
    public string? AdminResponse { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? RespondedAt { get; set; }

    public virtual User? User { get; set; }
}
