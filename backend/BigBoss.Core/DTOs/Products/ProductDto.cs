using BigBoss.Core.Entities;

namespace BigBoss.Core.DTOs.Products;

public class ProductDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ProductCategory Category { get; set; }
    public decimal PriceMad { get; set; }
    public decimal? DiscountedPriceMad { get; set; }
    public decimal? DiscountPercent => DiscountedPriceMad.HasValue
        ? Math.Round((1 - DiscountedPriceMad.Value / PriceMad) * 100, 0)
        : null;
    public int Stock { get; set; }
    public bool IsAvailable { get; set; }
    public bool InStock => Stock > 0 && IsAvailable;
    public List<string> ImageUrls { get; set; } = new();
    public Dictionary<string, string>? Specs { get; set; }
    public bool IsFeatured { get; set; }
}

public class ProductListDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public ProductCategory Category { get; set; }
    public decimal PriceMad { get; set; }
    public decimal? DiscountedPriceMad { get; set; }
    public string? MainImageUrl { get; set; }
    public bool InStock { get; set; }
    public bool IsFeatured { get; set; }
}

public class CreateProductDto
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ProductCategory Category { get; set; }
    public decimal PriceMad { get; set; }
    public decimal? DiscountedPriceMad { get; set; }
    public int Stock { get; set; }
    public List<string> ImageUrls { get; set; } = new();
    public string? SupplierId { get; set; }
    public decimal CommissionPercent { get; set; }
    public Dictionary<string, string>? Specs { get; set; }
    public bool IsFeatured { get; set; }
}

public class UpdateProductDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public ProductCategory? Category { get; set; }
    public decimal? PriceMad { get; set; }
    public decimal? DiscountedPriceMad { get; set; }
    public int? Stock { get; set; }
    public bool? IsAvailable { get; set; }
    public List<string>? ImageUrls { get; set; }
    public string? SupplierId { get; set; }
    public decimal? CommissionPercent { get; set; }
    public Dictionary<string, string>? Specs { get; set; }
    public bool? IsActive { get; set; }
    public bool? IsFeatured { get; set; }
}

public class ProductFilterDto
{
    public ProductCategory? Category { get; set; }
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    public bool? InStock { get; set; }
    public bool? OnSale { get; set; }
    public string? Search { get; set; }
}
