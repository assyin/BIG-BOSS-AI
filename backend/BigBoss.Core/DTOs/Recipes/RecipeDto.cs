using BigBoss.Core.Entities;

namespace BigBoss.Core.DTOs.Recipes;

public class RecipeDto
{
    public Guid Id { get; set; }
    public string TitleFr { get; set; } = string.Empty;
    public string? TitleAr { get; set; }
    public string? TitleDarija { get; set; }
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? DescriptionDarija { get; set; }
    public List<string> IngredientsDarija { get; set; } = new();
    public List<string> StepsDarija { get; set; } = new();
    public RecipeCategory Category { get; set; }
    public string? MealType { get; set; }
    public string? CuisineType { get; set; }
    public string? DifficultyLevel { get; set; }
    public List<string> DietTags { get; set; } = new();
    public int PrepTimeMinutes { get; set; }
    public int CookTimeMinutes { get; set; }
    public int TotalTimeMinutes => PrepTimeMinutes + CookTimeMinutes;
    public int Servings { get; set; }
    public int CaloriesPerServing { get; set; }
    public decimal ProteinsGPerServing { get; set; }
    public decimal CarbsGPerServing { get; set; }
    public decimal FatsGPerServing { get; set; }
    public List<string> Ingredients { get; set; } = new();
    public List<string> Steps { get; set; } = new();
    public string? PhotoUrl { get; set; }
    public string? VideoUrl { get; set; }
    public List<string> Tags { get; set; } = new();
    public bool IsVegetarian { get; set; }
    public bool IsVegan { get; set; }
    public bool IsGlutenFree { get; set; }
    public bool IsRamadanFriendly { get; set; }
    public bool IsBulking { get; set; }
    public bool IsCutting { get; set; }
    public bool IsFeatured { get; set; }
}

public class RecipeListDto
{
    public Guid Id { get; set; }
    public string TitleFr { get; set; } = string.Empty;
    public RecipeCategory Category { get; set; }
    public int TotalTimeMinutes { get; set; }
    public int CaloriesPerServing { get; set; }
    public decimal ProteinsGPerServing { get; set; }
    public string? PhotoUrl { get; set; }
    public bool IsVegetarian { get; set; }
    public bool IsVegan { get; set; }
    public bool IsFeatured { get; set; }
}

public class CreateRecipeDto
{
    public string TitleFr { get; set; } = string.Empty;
    public string? TitleAr { get; set; }
    public RecipeCategory Category { get; set; }
    public int PrepTimeMinutes { get; set; }
    public int CookTimeMinutes { get; set; }
    public int Servings { get; set; } = 1;
    public int CaloriesPerServing { get; set; }
    public decimal ProteinsGPerServing { get; set; }
    public decimal CarbsGPerServing { get; set; }
    public decimal FatsGPerServing { get; set; }
    public List<string> Ingredients { get; set; } = new();
    public List<string> Steps { get; set; } = new();
    public string? PhotoUrl { get; set; }
    public string? VideoUrl { get; set; }
    public List<string> Tags { get; set; } = new();
    public bool IsVegetarian { get; set; }
    public bool IsVegan { get; set; }
    public bool IsGlutenFree { get; set; }
    public bool IsRamadanFriendly { get; set; }
    public bool IsBulking { get; set; }
    public bool IsCutting { get; set; }
    public bool IsFeatured { get; set; }
}

public class UpdateRecipeDto
{
    public string? TitleFr { get; set; }
    public string? TitleAr { get; set; }
    public RecipeCategory? Category { get; set; }
    public int? PrepTimeMinutes { get; set; }
    public int? CookTimeMinutes { get; set; }
    public int? Servings { get; set; }
    public int? CaloriesPerServing { get; set; }
    public decimal? ProteinsGPerServing { get; set; }
    public decimal? CarbsGPerServing { get; set; }
    public decimal? FatsGPerServing { get; set; }
    public List<string>? Ingredients { get; set; }
    public List<string>? Steps { get; set; }
    public string? PhotoUrl { get; set; }
    public string? VideoUrl { get; set; }
    public List<string>? Tags { get; set; }
    public bool? IsVegetarian { get; set; }
    public bool? IsVegan { get; set; }
    public bool? IsGlutenFree { get; set; }
    public bool? IsRamadanFriendly { get; set; }
    public bool? IsBulking { get; set; }
    public bool? IsCutting { get; set; }
    public bool? IsActive { get; set; }
    public bool? IsFeatured { get; set; }
}

public class RecipeFilterDto
{
    public RecipeCategory? Category { get; set; }
    public bool? IsVegetarian { get; set; }
    public bool? IsVegan { get; set; }
    public bool? IsGlutenFree { get; set; }
    public bool? IsRamadanFriendly { get; set; }
    public bool? IsBulking { get; set; }
    public bool? IsCutting { get; set; }
    public int? MaxCalories { get; set; }
    public int? MinProtein { get; set; }
    public int? MaxTotalTime { get; set; }
    public string? Search { get; set; }
}
