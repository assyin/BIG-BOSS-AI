using System.Text.Json;
using System.Text.RegularExpressions;
using BigBoss.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace BigBoss.API.Controllers;

/// <summary>
/// Sprint 3.5 — Liste de courses générée depuis le plan nutrition du programme.
/// </summary>
[ApiController]
[Route("api/programmes/{programmeId:guid}/grocery-list")]
[Authorize]
public class GroceryListController : ControllerBase
{
    private readonly BigBossDbContext _context;

    public GroceryListController(BigBossDbContext context)
    {
        _context = context;
    }

    private Guid GetCurrentUserId()
    {
        var id = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.Parse(id!);
    }

    /// <summary>
    /// Génère la liste de courses pour la semaine courante (ou ?week=N).
    /// Agrège tous les ingrédients des 7 jours (3 repas/jour) + catégorise.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> Get(Guid programmeId, [FromQuery] int? week = null)
    {
        var userId = GetCurrentUserId();

        var prog = await _context.Programmes.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == programmeId && p.UserId == userId);
        if (prog == null) return NotFound(new { error = "Programme not found" });

        if (string.IsNullOrEmpty(prog.MealPlanJson))
            return Ok(new { week = week ?? 1, totalItems = 0, categories = Array.Empty<object>() });

        List<DayMeals>? days;
        try
        {
            days = JsonSerializer.Deserialize<List<DayMeals>>(prog.MealPlanJson, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
            });
        }
        catch
        {
            return Ok(new { week = week ?? 1, totalItems = 0, categories = Array.Empty<object>(), error = "MealPlanJson parse error" });
        }
        if (days == null || days.Count == 0)
            return Ok(new { week = week ?? 1, totalItems = 0, categories = Array.Empty<object>() });

        // Extraire tous les recipeIds uniques de la semaine
        var recipeIds = new HashSet<Guid>();
        var recipeIdToMealLabel = new Dictionary<Guid, List<string>>();
        foreach (var d in days)
        {
            void AddRecipe(MealEntry? m, string meal)
            {
                if (m == null || string.IsNullOrEmpty(m.RecipeId)) return;
                if (Guid.TryParse(m.RecipeId, out var gid))
                {
                    recipeIds.Add(gid);
                    if (!recipeIdToMealLabel.ContainsKey(gid))
                        recipeIdToMealLabel[gid] = new List<string>();
                    recipeIdToMealLabel[gid].Add($"{d.DayName ?? d.Day.ToString()} {meal}");
                }
            }
            AddRecipe(d.Breakfast, "petit-déj");
            AddRecipe(d.Lunch, "déj");
            AddRecipe(d.Dinner, "dîner");
            AddRecipe(d.Snack, "collation");
        }

        if (recipeIds.Count == 0)
            return Ok(new { week = week ?? 1, totalItems = 0, categories = Array.Empty<object>() });

        // Récupérer ingrédients depuis Recipes
        var recipes = await _context.Recipes.AsNoTracking()
            .Where(r => recipeIds.Contains(r.Id))
            .Select(r => new { r.Id, r.Title, r.IngredientsJson })
            .ToListAsync();

        // Catégoriser
        var items = new List<GroceryItem>();
        foreach (var r in recipes)
        {
            if (string.IsNullOrEmpty(r.IngredientsJson)) continue;
            List<string>? ings;
            try { ings = JsonSerializer.Deserialize<List<string>>(r.IngredientsJson); }
            catch { continue; }
            if (ings == null) continue;
            foreach (var ing in ings)
            {
                if (string.IsNullOrWhiteSpace(ing)) continue;
                var cat = Categorize(ing);
                items.Add(new GroceryItem
                {
                    Text = ing.Trim(),
                    Category = cat,
                    Recipe = r.Title,
                    Meals = recipeIdToMealLabel.GetValueOrDefault(r.Id, new List<string>()),
                });
            }
        }

        var grouped = items
            .GroupBy(i => i.Category)
            .OrderBy(g => CategoryOrder(g.Key))
            .Select(g => new
            {
                name = g.Key,
                items = g.OrderBy(i => i.Text).Select(i => new
                {
                    text = i.Text,
                    recipe = i.Recipe,
                    meals = i.Meals,
                }).ToList(),
            }).ToList();

        return Ok(new
        {
            week = week ?? prog.CurrentWeek,
            programmeId,
            totalItems = items.Count,
            categories = grouped,
        });
    }

    // ─── Catégorisation par regex/keywords ─────────────────────────────

    private static readonly Dictionary<string, string[]> CATEGORY_KEYWORDS = new(StringComparer.OrdinalIgnoreCase)
    {
        ["🥩 Protéines"] = new[] { "poulet", "boeuf", "bœuf", "porc", "agneau", "viande", "dinde", "thon", "saumon", "poisson", "crevette", "œuf", "oeuf", "tofu", "tempeh", "fromage", "feta", "ricotta", "mozzarella", "parmesan", "yaourt", "jambon", "bacon", "lentille", "pois chiche", "haricot rouge", "haricot noir" },
        ["🥦 Légumes"] = new[] { "tomate", "oignon", "ail", "courgette", "aubergine", "poivron", "carotte", "salade", "laitue", "épinard", "brocoli", "concombre", "céleri", "champignon", "chou", "patate douce", "betterave", "asperge", "haricot vert", "petits pois", "radis", "fenouil", "endive", "artichaut", "navet" },
        ["🍞 Féculents"] = new[] { "riz", "pâte", "pâtes", "pain", "pomme de terre", "semoule", "couscous", "farine", "quinoa", "boulgour", "tortilla", "wrap", "pita", "nouille", "polenta", "avoine", "orge" },
        ["🍎 Fruits"] = new[] { "pomme", "banane", "citron", "orange", "fraise", "framboise", "myrtille", "ananas", "mangue", "kiwi", "raisin", "datte", "abricot", "pêche", "avocat", "grenade", "figue" },
        ["🌿 Épices & Condiments"] = new[] { "sel", "poivre", "huile", "vinaigre", "sauce soja", "soja", "moutarde", "miel", "sucre", "ketchup", "mayonnaise", "tahini", "cumin", "paprika", "curcuma", "gingembre", "cannelle", "basilic", "persil", "coriandre", "menthe", "thym", "romarin", "muscade", "cardamome", "safran" },
        ["🥛 Produits laitiers"] = new[] { "lait", "beurre", "crème", "kéfir" },
        ["🧂 Boulangerie & secs"] = new[] { "levure", "bicarbonate", "xanthane", "amidon", "chocolat", "cacao", "vanille", "extrait" },
    };

    private static string Categorize(string ingredient)
    {
        var lower = ingredient.ToLowerInvariant();
        foreach (var (cat, keywords) in CATEGORY_KEYWORDS)
        {
            if (keywords.Any(kw => lower.Contains(kw)))
                return cat;
        }
        return "📦 Autres";
    }

    private static int CategoryOrder(string cat) => cat switch
    {
        "🥩 Protéines" => 1,
        "🥦 Légumes" => 2,
        "🍎 Fruits" => 3,
        "🍞 Féculents" => 4,
        "🥛 Produits laitiers" => 5,
        "🌿 Épices & Condiments" => 6,
        "🧂 Boulangerie & secs" => 7,
        _ => 99,
    };

    // ─── DTOs internes pour parsing MealPlanJson ───────────────────────

    private class DayMeals
    {
        public int Day { get; set; }
        public string? DayName { get; set; }
        public MealEntry? Breakfast { get; set; }
        public MealEntry? Lunch { get; set; }
        public MealEntry? Dinner { get; set; }
        public MealEntry? Snack { get; set; }
    }

    private class MealEntry
    {
        public string? RecipeId { get; set; }
        public string? Title { get; set; }
    }

    private class GroceryItem
    {
        public string Text { get; set; } = "";
        public string Category { get; set; } = "";
        public string Recipe { get; set; } = "";
        public List<string> Meals { get; set; } = new();
    }
}
