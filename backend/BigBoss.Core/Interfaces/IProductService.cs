using BigBoss.Core.DTOs.Products;

namespace BigBoss.Core.Interfaces;

public interface IProductService
{
    Task<IEnumerable<ProductListDto>> GetAllAsync(ProductFilterDto? filter = null);
    Task<ProductDto?> GetByIdAsync(Guid id);
    Task<ProductDto> CreateAsync(CreateProductDto dto);
    Task<ProductDto?> UpdateAsync(Guid id, UpdateProductDto dto);
    Task<bool> DeleteAsync(Guid id);
    Task<IEnumerable<ProductListDto>> GetFeaturedAsync(int count = 8);
    Task<IEnumerable<ProductListDto>> SearchAsync(string query);
    Task<bool> UpdateStockAsync(Guid id, int quantity);
}
