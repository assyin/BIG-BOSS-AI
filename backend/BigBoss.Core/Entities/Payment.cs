using BigBoss.Core.Enums;

namespace BigBoss.Core.Entities;

/// <summary>
/// Sprint 2 — Transaction de paiement individuelle (1 row par charge).
/// Logé via webhook Stripe/CMI ou action admin manuelle.
/// </summary>
public class Payment
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public User? User { get; set; }

    /// <summary>Lien vers la subscription si payment de renouvellement / 1er paiement (null si Manual/Refund standalone).</summary>
    public Guid? SubscriptionId { get; set; }
    public Subscription? Subscription { get; set; }

    public PaymentProvider Provider { get; set; }

    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;

    /// <summary>Montant chargé en MAD (toujours converti même si Stripe charge en EUR/USD).</summary>
    public decimal AmountMad { get; set; }

    /// <summary>Devise originale facturée (MAD, EUR, USD).</summary>
    public string Currency { get; set; } = "MAD";

    /// <summary>Si devise != MAD, taux utilisé pour la conversion (pour audit).</summary>
    public decimal? ExchangeRate { get; set; }

    /// <summary>ID transaction externe (Stripe charge ID, CMI orderId, etc.).</summary>
    public string? ProviderTransactionId { get; set; }

    /// <summary>Évent webhook pour idempotence (1 event = 1 traitement).</summary>
    public string? IdempotencyKey { get; set; }

    /// <summary>Payload raw du webhook (JSON) pour debug / audit.</summary>
    public string? RawWebhookPayload { get; set; }

    /// <summary>Si Refunded: motif de refund.</summary>
    public string? RefundReason { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
}
