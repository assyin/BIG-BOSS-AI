namespace BigBoss.Core.Entities;

public class Recipe
{
    public Guid Id { get; set; }

    // YMove source
    public string? YmoveId { get; set; }
    public string? YmoveSlug { get; set; }

    // Names
    public string TitleFr { get; set; } = string.Empty;
    public string? TitleAr { get; set; }
    public string? TitleDarija { get; set; }
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? DescriptionDarija { get; set; }

    // Darija content (JSON)
    public string IngredientsDarijaJson { get; set; } = "[]";
    public string StepsDarijaJson { get; set; } = "[]";

    // Category
    public RecipeCategory Category { get; set; }
    public string? MealType { get; set; }
    public string? CuisineType { get; set; }
    public string? DifficultyLevel { get; set; }

    // Timing
    public int PrepTimeMinutes { get; set; }
    public int CookTimeMinutes { get; set; }
    public int Servings { get; set; } = 1;

    // Macros per serving
    public int CaloriesPerServing { get; set; }
    public decimal ProteinsGPerServing { get; set; }
    public decimal CarbsGPerServing { get; set; }
    public decimal FatsGPerServing { get; set; }

    // Total macros (from YMove)
    public decimal? Calories { get; set; }
    public decimal? ProteinG { get; set; }
    public decimal? CarbsG { get; set; }
    public decimal? FatG { get; set; }

    // Diet tags from YMove (JSONB)
    public List<string> DietTags { get; set; } = new();

    // Content (JSON)
    public string IngredientsJson { get; set; } = "[]";
    public string StepsJson { get; set; } = "[]";

    // Media
    public string? PhotoUrl { get; set; }
    public string? VideoUrl { get; set; }

    // Tags
    public List<string> Tags { get; set; } = new();

    // Flags
    public bool IsVegetarian { get; set; }
    public bool IsVegan { get; set; }
    public bool IsGlutenFree { get; set; }
    public bool IsRamadanFriendly { get; set; }
    public bool IsBulking { get; set; }
    public bool IsCutting { get; set; }

    // Status
    public bool IsActive { get; set; } = true;
    public bool IsFeatured { get; set; }

    // Timestamps
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public enum RecipeCategory
{
    Breakfast = 1,
    Lunch = 2,
    Dinner = 3,
    Snack = 4,
    PreWorkout = 5,
    PostWorkout = 6,
    Smoothie = 7,
    Dessert = 8
}
