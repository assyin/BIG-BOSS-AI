namespace BigBoss.Core.Enums;

public enum PaymentProvider
{
    /// <summary>Stripe (cartes internationales + diaspora).</summary>
    Stripe = 0,
    /// <summary>Centre Monétique Interbancaire (Maroc).</summary>
    Cmi = 1,
    /// <summary>Crédit/ajustement manuel par admin.</summary>
    Manual = 2,
}
