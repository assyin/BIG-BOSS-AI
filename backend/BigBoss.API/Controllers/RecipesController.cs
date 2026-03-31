using BigBoss.Core.DTOs.Recipes;
using BigBoss.Core.Entities;
using BigBoss.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BigBoss.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RecipesController : ControllerBase
{
    private readonly IRecipeService _recipeService;
    private readonly ILogger<RecipesController> _logger;

    public RecipesController(IRecipeService recipeService, ILogger<RecipesController> logger)
    {
        _recipeService = recipeService;
        _logger = logger;
    }

    /// <summary>
    /// Get all recipes with optional filtering
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<RecipeListDto>>> GetAll([FromQuery] RecipeFilterDto filter)
    {
        var recipes = await _recipeService.GetAllAsync(filter);
        return Ok(recipes);
    }

    /// <summary>
    /// Get featured recipes
    /// </summary>
    [HttpGet("featured")]
    public async Task<ActionResult<IEnumerable<RecipeListDto>>> GetFeatured([FromQuery] int count = 6)
    {
        var recipes = await _recipeService.GetFeaturedAsync(count);
        return Ok(recipes);
    }

    /// <summary>
    /// Search recipes
    /// </summary>
    [HttpGet("search")]
    public async Task<ActionResult<IEnumerable<RecipeListDto>>> Search([FromQuery] string q)
    {
        if (string.IsNullOrWhiteSpace(q))
            return BadRequest(new { message = "Terme de recherche requis" });

        var recipes = await _recipeService.SearchAsync(q);
        return Ok(recipes);
    }

    /// <summary>
    /// Get recipes by category
    /// </summary>
    [HttpGet("category/{category}")]
    public async Task<ActionResult<IEnumerable<RecipeListDto>>> GetByCategory(RecipeCategory category)
    {
        var filter = new RecipeFilterDto { Category = category };
        var recipes = await _recipeService.GetAllAsync(filter);
        return Ok(recipes);
    }

    /// <summary>
    /// Get recipe by ID
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<RecipeDto>> GetById(Guid id)
    {
        var recipe = await _recipeService.GetByIdAsync(id);

        if (recipe == null)
            return NotFound(new { message = "Recette non trouvée" });

        return Ok(recipe);
    }

    /// <summary>
    /// Create a new recipe (Admin only)
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<RecipeDto>> Create([FromBody] CreateRecipeDto dto)
    {
        var recipe = await _recipeService.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = recipe.Id }, recipe);
    }

    /// <summary>
    /// Update a recipe (Admin only)
    /// </summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<RecipeDto>> Update(Guid id, [FromBody] UpdateRecipeDto dto)
    {
        var recipe = await _recipeService.UpdateAsync(id, dto);

        if (recipe == null)
            return NotFound(new { message = "Recette non trouvée" });

        return Ok(recipe);
    }

    /// <summary>
    /// Delete a recipe (Admin only)
    /// </summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _recipeService.DeleteAsync(id);

        if (!result)
            return NotFound(new { message = "Recette non trouvée" });

        return NoContent();
    }
}
