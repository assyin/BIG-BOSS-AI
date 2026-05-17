using BigBoss.Core.Entities;
using BigBoss.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace BigBoss.API.Controllers;

/// <summary>
/// Sprint 3.3 — favoris recettes (sync multi-device).
/// </summary>
[ApiController]
[Route("api/users/me/favorites")]
[Authorize]
public class FavoritesController : ControllerBase
{
    private readonly BigBossDbContext _context;

    public FavoritesController(BigBossDbContext context)
    {
        _context = context;
    }

    private Guid GetCurrentUserId()
    {
        var id = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.Parse(id!);
    }

    /// <summary>Liste des IDs recettes favorites de l'user.</summary>
    [HttpGet("recipes")]
    public async Task<IActionResult> GetFavoriteRecipes()
    {
        var userId = GetCurrentUserId();
        var ids = await _context.UserFavoriteRecipes.AsNoTracking()
            .Where(f => f.UserId == userId)
            .OrderByDescending(f => f.CreatedAt)
            .Select(f => f.RecipeId)
            .ToListAsync();
        return Ok(new { recipeIds = ids });
    }

    /// <summary>Ajoute une recette aux favoris (idempotent — pas d'erreur si déjà).</summary>
    [HttpPost("recipes/{recipeId:guid}")]
    public async Task<IActionResult> AddFavorite(Guid recipeId)
    {
        var userId = GetCurrentUserId();

        var recipeExists = await _context.Recipes.AsNoTracking().AnyAsync(r => r.Id == recipeId);
        if (!recipeExists) return NotFound(new { error = "Recipe not found" });

        var existing = await _context.UserFavoriteRecipes
            .FirstOrDefaultAsync(f => f.UserId == userId && f.RecipeId == recipeId);
        if (existing != null) return Ok(new { added = true, alreadyFavorite = true });

        _context.UserFavoriteRecipes.Add(new UserFavoriteRecipe { UserId = userId, RecipeId = recipeId });
        await _context.SaveChangesAsync();
        return Ok(new { added = true, alreadyFavorite = false });
    }

    /// <summary>Retire une recette des favoris (idempotent).</summary>
    [HttpDelete("recipes/{recipeId:guid}")]
    public async Task<IActionResult> RemoveFavorite(Guid recipeId)
    {
        var userId = GetCurrentUserId();
        var existing = await _context.UserFavoriteRecipes
            .FirstOrDefaultAsync(f => f.UserId == userId && f.RecipeId == recipeId);
        if (existing == null) return Ok(new { removed = true, wasFavorite = false });

        _context.UserFavoriteRecipes.Remove(existing);
        await _context.SaveChangesAsync();
        return Ok(new { removed = true, wasFavorite = true });
    }
}
