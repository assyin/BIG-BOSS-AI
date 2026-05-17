using BigBoss.Core.Enums;

namespace BigBoss.Core.Entities;

/// <summary>
/// Sprint 2 — Abonnement Premium / Elite d'un utilisateur.
/// Une nouvelle entité par cycle (création / changement plan / renouvellement = nouveau row si on change).
/// L'utilisateur peut avoir plusieurs subscriptions dans son historique mais une seule active à la fois.
/// </summary>
public class Subscription
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public User? User { get; set; }

    /// <summary>Plan acheté (Premium ou Elite — Free ne crée pas de Subscription row).</summary>
    public SubscriptionTier Tier { get; set; }

    /// <summary>Statut courant (Trial → Active → Cancelled → Expired).</summary>
    public SubscriptionStatus Status { get; set; } = SubscriptionStatus.Trial;

    /// <summary>Mensuel ou annuel.</summary>
    public RenewalPeriod Period { get; set; } = RenewalPeriod.Monthly;

    /// <summary>Prix payé en MAD (snapshot — peut changer dans le futur).</summary>
    public decimal AmountMad { get; set; }

    /// <summary>Provider qui a créé l'abonnement (Stripe, CMI, Manual).</summary>
    public PaymentProvider Provider { get; set; }

    /// <summary>ID externe Stripe subscription (sub_xxx) si Provider=Stripe.</summary>
    public string? StripeSubscriptionId { get; set; }

    /// <summary>Référence contrat CMI si Provider=Cmi.</summary>
    public string? CmiContractId { get; set; }

    /// <summary>Quand l'abonnement a démarré (start de la période actuelle).</summary>
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Quand expire la période en cours.
    /// Si auto-renew=true et payment réussit, est étendu automatiquement par RecordPaymentAsync.
    /// </summary>
    public DateTime ExpiresAt { get; set; }

    /// <summary>True = renouvellement automatique à ExpiresAt (default). False = cancel à fin période.</summary>
    public bool AutoRenew { get; set; } = true;

    /// <summary>Date d'annulation (info — l'accès reste actif jusqu'à ExpiresAt).</summary>
    public DateTime? CancelledAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    /// <summary>Historique des paiements associés à cet abonnement.</summary>
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}
