namespace BigBoss.Core.Enums;

/// <summary>
/// Lifecycle d'un abonnement payant.
/// </summary>
public enum SubscriptionStatus
{
    /// <summary>Période d'essai gratuit (avant 1er paiement).</summary>
    Trial = 0,
    /// <summary>Actif et payé, dans la période en cours.</summary>
    Active = 1,
    /// <summary>Annulé par l'user — actif jusqu'à ExpiresAt puis Expired.</summary>
    Cancelled = 2,
    /// <summary>Paiement de renouvellement échoué — accès maintenu temporairement.</summary>
    PastDue = 3,
    /// <summary>Expiré et non renouvelé — accès Premium révoqué.</summary>
    Expired = 4,
}
