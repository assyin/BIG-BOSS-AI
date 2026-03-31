namespace BigBoss.Core.Entities;

public class Product
{
    public Guid Id { get; set; }

    // Info
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ProductCategory Category { get; set; }

    // Pricing
    public decimal PriceMad { get; set; }
    public decimal? DiscountedPriceMad { get; set; }

    // Stock
    public int Stock { get; set; }
    public bool IsAvailable { get; set; } = true;

    // Media
    public List<string> ImageUrls { get; set; } = new();

    // Supplier (for dropshipping)
    public string? SupplierId { get; set; }
    public decimal CommissionPercent { get; set; }

    // Metadata
    public string? SpecsJson { get; set; }

    // Status
    public bool IsActive { get; set; } = true;
    public bool IsFeatured { get; set; }

    // Timestamps
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public enum ProductCategory
{
    Supplement = 1,
    Equipment = 2,
    Clothing = 3,
    Accessories = 4
}
