namespace BigBoss.Core.Entities;

/// <summary>
/// Sprint 5.2 — Profil "Gym Buddy" pour le matching social fitness.
/// Un user peut soit avoir un profile public visible (Visible=true), soit rester masqué.
/// </summary>
public class BuddyProfile
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }

    // Profil affiché aux autres
    public string Bio { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;          // "Casa", "Marrakech", "Rabat", ...
    public string? GymName { get; set; }                       // ex: "PowerHouse Casa Anfa"

    // Préférences (utilisées par l'algo matching)
    public List<string> Goals { get; set; } = new();           // "BuildMuscle", "LoseWeight", "Performance"
    public List<string> AvailableSlots { get; set; } = new();  // "weekday_morning", "weekday_evening", "weekend"
    public string? PreferredLanguage { get; set; }              // "fr" | "darija" | "ar"

    public bool Visible { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public virtual User User { get; set; } = null!;
}

public enum BuddyConnectionStatus
{
    Pending = 1,    // demande envoyée, en attente
    Accepted = 2,   // les deux d'accord, peuvent chatter
    Declined = 3,   // refusée
    Blocked = 4,    // bloqué par l'un des deux
}

/// <summary>
/// Sprint 5.2 — Connexion entre 2 buddies (request → accept/decline).
/// Unique par (RequesterId, AddresseeId) pour éviter les doublons.
/// </summary>
public class BuddyConnection
{
    public Guid Id { get; set; }
    public Guid RequesterId { get; set; }   // celui qui envoie la demande
    public Guid AddresseeId { get; set; }   // celui qui reçoit

    public BuddyConnectionStatus Status { get; set; } = BuddyConnectionStatus.Pending;
    public string? Message { get; set; }      // message d'invitation court optionnel

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? RespondedAt { get; set; }

    public virtual User Requester { get; set; } = null!;
    public virtual User Addressee { get; set; } = null!;
}
