using System.Text.Json;
using BigBoss.Core.DTOs.Products;
using BigBoss.Core.Entities;
using BigBoss.Core.Interfaces;
using BigBoss.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BigBoss.Infrastructure.Services;

public class ProductService : IProductService
{
    private readonly BigBossDbContext _context;
    private readonly ILogger<ProductService> _logger;

    public ProductService(BigBossDbContext context, ILogger<ProductService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<IEnumerable<ProductListDto>> GetAllAsync(ProductFilterDto? filter = null)
    {
        var query = _context.Products.Where(p => p.IsActive).AsQueryable();

        if (filter != null)
        {
            if (filter.Category.HasValue)
                query = query.Where(p => p.Category == filter.Category.Value);
            if (filter.MinPrice.HasValue)
                query = query.Where(p => (p.DiscountedPriceMad ?? p.PriceMad) >= filter.MinPrice.Value);
            if (filter.MaxPrice.HasValue)
                query = query.Where(p => (p.DiscountedPriceMad ?? p.PriceMad) <= filter.MaxPrice.Value);
            if (filter.InStock == true)
                query = query.Where(p => p.Stock > 0 && p.IsAvailable);
            if (filter.OnSale == true)
                query = query.Where(p => p.DiscountedPriceMad.HasValue);
            if (!string.IsNullOrWhiteSpace(filter.Search))
                query = query.Where(p => p.Name.ToLower().Contains(filter.Search.ToLower()) ||
                                         (p.Description != null && p.Description.ToLower().Contains(filter.Search.ToLower())));
        }

        var products = await query
            .OrderByDescending(p => p.IsFeatured)
            .ThenByDescending(p => p.CreatedAt)
            .ToListAsync();

        return products.Select(MapToListDto);
    }

    public async Task<ProductDto?> GetByIdAsync(Guid id)
    {
        var product = await _context.Products.FindAsync(id);
        if (product == null || !product.IsActive) return null;

        return MapToDto(product);
    }

    public async Task<ProductDto> CreateAsync(CreateProductDto dto)
    {
        var product = new Product
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            Description = dto.Description,
            Category = dto.Category,
            PriceMad = dto.PriceMad,
            DiscountedPriceMad = dto.DiscountedPriceMad,
            Stock = dto.Stock,
            IsAvailable = true,
            ImageUrls = dto.ImageUrls,
            SupplierId = dto.SupplierId,
            CommissionPercent = dto.CommissionPercent,
            SpecsJson = dto.Specs != null ? JsonSerializer.Serialize(dto.Specs) : null,
            IsFeatured = dto.IsFeatured,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Products.Add(product);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Product created: {Name} (ID: {Id})", product.Name, product.Id);

        return MapToDto(product);
    }

    public async Task<ProductDto?> UpdateAsync(Guid id, UpdateProductDto dto)
    {
        var product = await _context.Products.FindAsync(id);
        if (product == null) return null;

        if (dto.Name != null) product.Name = dto.Name;
        if (dto.Description != null) product.Description = dto.Description;
        if (dto.Category.HasValue) product.Category = dto.Category.Value;
        if (dto.PriceMad.HasValue) product.PriceMad = dto.PriceMad.Value;
        if (dto.DiscountedPriceMad.HasValue) product.DiscountedPriceMad = dto.DiscountedPriceMad.Value;
        if (dto.Stock.HasValue) product.Stock = dto.Stock.Value;
        if (dto.IsAvailable.HasValue) product.IsAvailable = dto.IsAvailable.Value;
        if (dto.ImageUrls != null) product.ImageUrls = dto.ImageUrls;
        if (dto.SupplierId != null) product.SupplierId = dto.SupplierId;
        if (dto.CommissionPercent.HasValue) product.CommissionPercent = dto.CommissionPercent.Value;
        if (dto.Specs != null) product.SpecsJson = JsonSerializer.Serialize(dto.Specs);
        if (dto.IsActive.HasValue) product.IsActive = dto.IsActive.Value;
        if (dto.IsFeatured.HasValue) product.IsFeatured = dto.IsFeatured.Value;

        product.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Product updated: {Id}", id);

        return MapToDto(product);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var product = await _context.Products.FindAsync(id);
        if (product == null) return false;

        product.IsActive = false;
        product.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Product soft-deleted: {Id}", id);

        return true;
    }

    public async Task<IEnumerable<ProductListDto>> GetFeaturedAsync(int count = 8)
    {
        var products = await _context.Products
            .Where(p => p.IsActive && p.IsFeatured && p.Stock > 0 && p.IsAvailable)
            .OrderByDescending(p => p.CreatedAt)
            .Take(count)
            .ToListAsync();

        return products.Select(MapToListDto);
    }

    public async Task<IEnumerable<ProductListDto>> SearchAsync(string query)
    {
        var products = await _context.Products
            .Where(p => p.IsActive &&
                        (p.Name.ToLower().Contains(query.ToLower()) ||
                         (p.Description != null && p.Description.ToLower().Contains(query.ToLower()))))
            .OrderByDescending(p => p.IsFeatured)
            .ThenByDescending(p => p.CreatedAt)
            .Take(20)
            .ToListAsync();

        return products.Select(MapToListDto);
    }

    public async Task<bool> UpdateStockAsync(Guid id, int quantity)
    {
        var product = await _context.Products.FindAsync(id);
        if (product == null) return false;

        product.Stock += quantity;
        if (product.Stock < 0) product.Stock = 0;

        product.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Product stock updated: {Id}, new stock: {Stock}", id, product.Stock);

        return true;
    }

    private static ProductDto MapToDto(Product product)
    {
        return new ProductDto
        {
            Id = product.Id,
            Name = product.Name,
            Description = product.Description,
            Category = product.Category,
            PriceMad = product.PriceMad,
            DiscountedPriceMad = product.DiscountedPriceMad,
            Stock = product.Stock,
            IsAvailable = product.IsAvailable,
            ImageUrls = product.ImageUrls,
            Specs = !string.IsNullOrEmpty(product.SpecsJson)
                ? JsonSerializer.Deserialize<Dictionary<string, string>>(product.SpecsJson)
                : null,
            IsFeatured = product.IsFeatured
        };
    }

    private static ProductListDto MapToListDto(Product product)
    {
        return new ProductListDto
        {
            Id = product.Id,
            Name = product.Name,
            Category = product.Category,
            PriceMad = product.PriceMad,
            DiscountedPriceMad = product.DiscountedPriceMad,
            MainImageUrl = product.ImageUrls.FirstOrDefault(),
            InStock = product.Stock > 0 && product.IsAvailable,
            IsFeatured = product.IsFeatured
        };
    }
}
