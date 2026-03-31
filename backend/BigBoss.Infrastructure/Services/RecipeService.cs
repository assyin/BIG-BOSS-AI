using System.Text.Json;
using BigBoss.Core.DTOs.Recipes;
using BigBoss.Core.Entities;
using BigBoss.Core.Interfaces;
using BigBoss.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BigBoss.Infrastructure.Services;

public class RecipeService : IRecipeService
{
    private readonly BigBossDbContext _context;
    private readonly ILogger<RecipeService> _logger;

    public RecipeService(BigBossDbContext context, ILogger<RecipeService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<IEnumerable<RecipeListDto>> GetAllAsync(RecipeFilterDto? filter = null)
    {
        var query = _context.Recipes.Where(r => r.IsActive).AsQueryable();

        if (filter != null)
        {
            if (filter.Category.HasValue)
                query = query.Where(r => r.Category == filter.Category.Value);
            if (filter.IsVegetarian == true)
                query = query.Where(r => r.IsVegetarian);
            if (filter.IsVegan == true)
                query = query.Where(r => r.IsVegan);
            if (filter.IsGlutenFree == true)
                query = query.Where(r => r.IsGlutenFree);
            if (filter.IsRamadanFriendly == true)
                query = query.Where(r => r.IsRamadanFriendly);
            if (filter.IsBulking == true)
                query = query.Where(r => r.IsBulking);
            if (filter.IsCutting == true)
                query = query.Where(r => r.IsCutting);
            if (filter.MaxCalories.HasValue)
                query = query.Where(r => r.CaloriesPerServing <= filter.MaxCalories.Value);
            if (filter.MinProtein.HasValue)
                query = query.Where(r => r.ProteinsGPerServing >= filter.MinProtein.Value);
            if (filter.MaxTotalTime.HasValue)
                query = query.Where(r => r.PrepTimeMinutes + r.CookTimeMinutes <= filter.MaxTotalTime.Value);
            if (!string.IsNullOrWhiteSpace(filter.Search))
                query = query.Where(r => r.TitleFr.ToLower().Contains(filter.Search.ToLower()) ||
                                         (r.TitleAr != null && r.TitleAr.ToLower().Contains(filter.Search.ToLower())));
        }

        var recipes = await query
            .OrderByDescending(r => r.IsFeatured)
            .ThenByDescending(r => r.CreatedAt)
            .ToListAsync();

        return recipes.Select(MapToListDto);
    }

    public async Task<RecipeDto?> GetByIdAsync(Guid id)
    {
        var recipe = await _context.Recipes.FindAsync(id);
        if (recipe == null || !recipe.IsActive) return null;

        return MapToDto(recipe);
    }

    public async Task<RecipeDto> CreateAsync(CreateRecipeDto dto)
    {
        var recipe = new Recipe
        {
            Id = Guid.NewGuid(),
            TitleFr = dto.TitleFr,
            TitleAr = dto.TitleAr,
            Category = dto.Category,
            PrepTimeMinutes = dto.PrepTimeMinutes,
            CookTimeMinutes = dto.CookTimeMinutes,
            Servings = dto.Servings,
            CaloriesPerServing = dto.CaloriesPerServing,
            ProteinsGPerServing = dto.ProteinsGPerServing,
            CarbsGPerServing = dto.CarbsGPerServing,
            FatsGPerServing = dto.FatsGPerServing,
            IngredientsJson = JsonSerializer.Serialize(dto.Ingredients),
            StepsJson = JsonSerializer.Serialize(dto.Steps),
            PhotoUrl = dto.PhotoUrl,
            VideoUrl = dto.VideoUrl,
            Tags = dto.Tags,
            IsVegetarian = dto.IsVegetarian,
            IsVegan = dto.IsVegan,
            IsGlutenFree = dto.IsGlutenFree,
            IsRamadanFriendly = dto.IsRamadanFriendly,
            IsBulking = dto.IsBulking,
            IsCutting = dto.IsCutting,
            IsFeatured = dto.IsFeatured,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Recipes.Add(recipe);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Recipe created: {Title} (ID: {Id})", recipe.TitleFr, recipe.Id);

        return MapToDto(recipe);
    }

    public async Task<RecipeDto?> UpdateAsync(Guid id, UpdateRecipeDto dto)
    {
        var recipe = await _context.Recipes.FindAsync(id);
        if (recipe == null) return null;

        if (dto.TitleFr != null) recipe.TitleFr = dto.TitleFr;
        if (dto.TitleAr != null) recipe.TitleAr = dto.TitleAr;
        if (dto.Category.HasValue) recipe.Category = dto.Category.Value;
        if (dto.PrepTimeMinutes.HasValue) recipe.PrepTimeMinutes = dto.PrepTimeMinutes.Value;
        if (dto.CookTimeMinutes.HasValue) recipe.CookTimeMinutes = dto.CookTimeMinutes.Value;
        if (dto.Servings.HasValue) recipe.Servings = dto.Servings.Value;
        if (dto.CaloriesPerServing.HasValue) recipe.CaloriesPerServing = dto.CaloriesPerServing.Value;
        if (dto.ProteinsGPerServing.HasValue) recipe.ProteinsGPerServing = dto.ProteinsGPerServing.Value;
        if (dto.CarbsGPerServing.HasValue) recipe.CarbsGPerServing = dto.CarbsGPerServing.Value;
        if (dto.FatsGPerServing.HasValue) recipe.FatsGPerServing = dto.FatsGPerServing.Value;
        if (dto.Ingredients != null) recipe.IngredientsJson = JsonSerializer.Serialize(dto.Ingredients);
        if (dto.Steps != null) recipe.StepsJson = JsonSerializer.Serialize(dto.Steps);
        if (dto.PhotoUrl != null) recipe.PhotoUrl = dto.PhotoUrl;
        if (dto.VideoUrl != null) recipe.VideoUrl = dto.VideoUrl;
        if (dto.Tags != null) recipe.Tags = dto.Tags;
        if (dto.IsVegetarian.HasValue) recipe.IsVegetarian = dto.IsVegetarian.Value;
        if (dto.IsVegan.HasValue) recipe.IsVegan = dto.IsVegan.Value;
        if (dto.IsGlutenFree.HasValue) recipe.IsGlutenFree = dto.IsGlutenFree.Value;
        if (dto.IsRamadanFriendly.HasValue) recipe.IsRamadanFriendly = dto.IsRamadanFriendly.Value;
        if (dto.IsBulking.HasValue) recipe.IsBulking = dto.IsBulking.Value;
        if (dto.IsCutting.HasValue) recipe.IsCutting = dto.IsCutting.Value;
        if (dto.IsActive.HasValue) recipe.IsActive = dto.IsActive.Value;
        if (dto.IsFeatured.HasValue) recipe.IsFeatured = dto.IsFeatured.Value;

        recipe.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Recipe updated: {Id}", id);

        return MapToDto(recipe);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var recipe = await _context.Recipes.FindAsync(id);
        if (recipe == null) return false;

        recipe.IsActive = false;
        recipe.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Recipe soft-deleted: {Id}", id);

        return true;
    }

    public async Task<IEnumerable<RecipeListDto>> GetFeaturedAsync(int count = 6)
    {
        var recipes = await _context.Recipes
            .Where(r => r.IsActive && r.IsFeatured)
            .OrderByDescending(r => r.CreatedAt)
            .Take(count)
            .ToListAsync();

        return recipes.Select(MapToListDto);
    }

    public async Task<IEnumerable<RecipeListDto>> SearchAsync(string query)
    {
        var recipes = await _context.Recipes
            .Where(r => r.IsActive &&
                        (r.TitleFr.ToLower().Contains(query.ToLower()) ||
                         (r.TitleAr != null && r.TitleAr.ToLower().Contains(query.ToLower())) ||
                         r.Tags.Any(t => t.ToLower().Contains(query.ToLower()))))
            .OrderByDescending(r => r.IsFeatured)
            .ThenByDescending(r => r.CreatedAt)
            .Take(20)
            .ToListAsync();

        return recipes.Select(MapToListDto);
    }

    private static RecipeDto MapToDto(Recipe recipe)
    {
        return new RecipeDto
        {
            Id = recipe.Id,
            TitleFr = recipe.TitleFr,
            TitleAr = recipe.TitleAr,
            TitleDarija = recipe.TitleDarija,
            Title = recipe.Title,
            Description = recipe.Description,
            DescriptionDarija = recipe.DescriptionDarija,
            IngredientsDarija = JsonSerializer.Deserialize<List<string>>(recipe.IngredientsDarijaJson ?? "[]") ?? new(),
            StepsDarija = JsonSerializer.Deserialize<List<string>>(recipe.StepsDarijaJson ?? "[]") ?? new(),
            Category = recipe.Category,
            MealType = recipe.MealType,
            CuisineType = recipe.CuisineType,
            DifficultyLevel = recipe.DifficultyLevel,
            DietTags = recipe.DietTags,
            PrepTimeMinutes = recipe.PrepTimeMinutes,
            CookTimeMinutes = recipe.CookTimeMinutes,
            Servings = recipe.Servings,
            CaloriesPerServing = recipe.CaloriesPerServing,
            ProteinsGPerServing = recipe.ProteinsGPerServing,
            CarbsGPerServing = recipe.CarbsGPerServing,
            FatsGPerServing = recipe.FatsGPerServing,
            Ingredients = JsonSerializer.Deserialize<List<string>>(recipe.IngredientsJson) ?? new(),
            Steps = JsonSerializer.Deserialize<List<string>>(recipe.StepsJson) ?? new(),
            PhotoUrl = recipe.PhotoUrl,
            VideoUrl = recipe.VideoUrl,
            Tags = recipe.Tags,
            IsVegetarian = recipe.IsVegetarian,
            IsVegan = recipe.IsVegan,
            IsGlutenFree = recipe.IsGlutenFree,
            IsRamadanFriendly = recipe.IsRamadanFriendly,
            IsBulking = recipe.IsBulking,
            IsCutting = recipe.IsCutting,
            IsFeatured = recipe.IsFeatured
        };
    }

    private static RecipeListDto MapToListDto(Recipe recipe)
    {
        return new RecipeListDto
        {
            Id = recipe.Id,
            TitleFr = recipe.TitleFr,
            Category = recipe.Category,
            TotalTimeMinutes = recipe.PrepTimeMinutes + recipe.CookTimeMinutes,
            CaloriesPerServing = recipe.CaloriesPerServing,
            ProteinsGPerServing = recipe.ProteinsGPerServing,
            PhotoUrl = recipe.PhotoUrl,
            IsVegetarian = recipe.IsVegetarian,
            IsVegan = recipe.IsVegan,
            IsFeatured = recipe.IsFeatured
        };
    }
}
