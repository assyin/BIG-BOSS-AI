using BigBoss.Core.Entities;
using BigBoss.Core.Enums;

namespace BigBoss.Core.Interfaces;

public interface ISubscriptionService
{
    /// <summary>Retourne l'abonnement actif courant ou null si Free.</summary>
    Task<Subscription?> GetCurrentAsync(Guid userId);

    /// <summary>Historique complet des abonnements d'un user.</summary>
    Task<IReadOnlyList<Subscription>> GetHistoryAsync(Guid userId);

    /// <summary>
    /// Crée un nouvel abonnement Trial (utilisé après checkout success Stripe/CMI ou manuel admin).
    /// Cancel l'ancien si existant. Met à jour User.SubscriptionTier + ExpiresAt.
    /// </summary>
    Task<Subscription> CreateAsync(Guid userId, SubscriptionTier tier, RenewalPeriod period, PaymentProvider provider, decimal amountMad, string? externalId = null);

    /// <summary>Marque l'abonnement courant Cancelled (accès reste actif jusqu'à ExpiresAt).</summary>
    Task<Subscription?> CancelAsync(Guid userId);

    /// <summary>
    /// Log un paiement et étend ExpiresAt si renouvellement réussi.
    /// Idempotent via IdempotencyKey (skip si déjà traité).
    /// </summary>
    Task<Payment> RecordPaymentAsync(Guid userId, Guid? subscriptionId, PaymentProvider provider, PaymentStatus status, decimal amountMad, string currency = "MAD", string? providerTxId = null, string? idempotencyKey = null, string? rawWebhook = null);

    /// <summary>
    /// Re-calcule SubscriptionTier + ExpiresAt sur User depuis la dernière subscription Active.
    /// À appeler après tout changement.
    /// </summary>
    Task SyncUserTierAsync(Guid userId);

    /// <summary>Tarifs Free/Premium/Elite en MAD pour un period donné.</summary>
    decimal GetPriceMad(SubscriptionTier tier, RenewalPeriod period);
}
