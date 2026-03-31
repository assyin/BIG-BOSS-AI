using BigBoss.Core.DTOs.Recipes;

namespace BigBoss.Core.Interfaces;

public interface IRecipeService
{
    Task<IEnumerable<RecipeListDto>> GetAllAsync(RecipeFilterDto? filter = null);
    Task<RecipeDto?> GetByIdAsync(Guid id);
    Task<RecipeDto> CreateAsync(CreateRecipeDto dto);
    Task<RecipeDto?> UpdateAsync(Guid id, UpdateRecipeDto dto);
    Task<bool> DeleteAsync(Guid id);
    Task<IEnumerable<RecipeListDto>> GetFeaturedAsync(int count = 6);
    Task<IEnumerable<RecipeListDto>> SearchAsync(string query);
}
