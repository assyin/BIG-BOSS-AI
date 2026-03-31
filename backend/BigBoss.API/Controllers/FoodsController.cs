using BigBoss.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BigBoss.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FoodsController : ControllerBase
{
    private readonly BigBossDbContext _context;

    public FoodsController(BigBossDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Search foods and recipes by name
    /// </summary>
    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string q, [FromQuery] int limit = 20)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Length < 2)
            return Ok(new { foods = Array.Empty<object>(), recipes = Array.Empty<object>() });

        var query = q.ToLower();

        // Search foods
        var foods = await _context.Foods
            .AsNoTracking()
            .Where(f => f.IsActive && (
                f.NameEn.ToLower().Contains(query) ||
                (f.DisplayName != null && f.DisplayName.ToLower().Contains(query)) ||
                (f.ShortName != null && f.ShortName.ToLower().Contains(query)) ||
                (f.NameFr != null && f.NameFr.ToLower().Contains(query)) ||
                f.Category.ToLower().Contains(query)))
            .Take(limit)
            .Select(f => new
            {
                f.Id,
                type = "food",
                name = f.DisplayName ?? f.ShortName ?? f.NameEn,
                nameFr = f.NameFr,
                category = f.Category,
                servingSize = f.ServingSizeG,
                servingDescription = f.ServingDescription,
                calories = f.Calories,
                protein = f.ProteinG,
                carbs = f.CarbsG,
                fat = f.FatG,
                fiber = f.FiberG,
            })
            .ToListAsync();

        // Search recipes
        var recipes = await _context.Recipes
            .AsNoTracking()
            .Where(r => r.IsActive && (
                r.TitleFr.ToLower().Contains(query) ||
                (r.Title != null && r.Title.ToLower().Contains(query)) ||
                (r.TitleDarija != null && r.TitleDarija.Contains(query))))
            .Take(limit)
            .Select(r => new
            {
                r.Id,
                type = "recipe",
                name = r.Title ?? r.TitleFr,
                nameFr = r.TitleFr,
                nameDarija = r.TitleDarija,
                category = r.MealType ?? "meal",
                servingSize = r.Servings > 0 ? 1 : 1,
                servingDescription = $"1 portion ({r.Servings} portions)",
                calories = (decimal)r.CaloriesPerServing,
                protein = r.ProteinsGPerServing,
                carbs = r.CarbsGPerServing,
                fat = r.FatsGPerServing,
                fiber = (decimal?)null,
            })
            .ToListAsync();

        return Ok(new { foods, recipes });
    }

    /// <summary>
    /// Get all foods (paginated)
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? category = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var query = _context.Foods.AsNoTracking().Where(f => f.IsActive);

        if (!string.IsNullOrEmpty(category))
            query = query.Where(f => f.Category.ToLower().Contains(category.ToLower()));

        var total = await query.CountAsync();
        var foods = await query
            .OrderBy(f => f.DisplayName ?? f.NameEn)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(f => new
            {
                f.Id,
                name = f.DisplayName ?? f.ShortName ?? f.NameEn,
                nameFr = f.NameFr,
                category = f.Category,
                servingSize = f.ServingSizeG,
                calories = f.Calories,
                protein = f.ProteinG,
                carbs = f.CarbsG,
                fat = f.FatG,
            })
            .ToListAsync();

        return Ok(new { items = foods, totalCount = total, page, pageSize });
    }
}
