namespace BigBoss.Core.Entities;

public class Food
{
    public Guid Id { get; set; }

    // YMove source
    public string? YmoveId { get; set; }

    // Names
    public string NameEn { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public string? ShortName { get; set; }
    public string? NameFr { get; set; }

    // Category
    public string Category { get; set; } = string.Empty;

    // Serving
    public decimal ServingSizeG { get; set; } = 100;
    public string? ServingDescription { get; set; }

    // Nutrition per serving
    public decimal Calories { get; set; }
    public decimal ProteinG { get; set; }
    public decimal CarbsG { get; set; }
    public decimal FatG { get; set; }
    public decimal? FiberG { get; set; }
    public decimal? SugarG { get; set; }
    public decimal? SodiumMg { get; set; }
    public decimal? CholesterolMg { get; set; }
    public decimal? SaturatedFatG { get; set; }

    // Extra
    public string? Barcode { get; set; }
    public string? ImageUrl { get; set; }
    public string Source { get; set; } = "usda";

    // Status
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
