namespace BigBoss.Core.Entities;

/// <summary>
/// Sprint 3.3 — Favori recette d'un utilisateur (table N-N entre Users et Recipes).
/// Permet sync multi-device (vs ancien store SecureStore local mobile uniquement).
/// </summary>
public class UserFavoriteRecipe
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public User? User { get; set; }

    public Guid RecipeId { get; set; }
    public Recipe? Recipe { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
