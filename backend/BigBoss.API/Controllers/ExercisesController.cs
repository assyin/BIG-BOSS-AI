using BigBoss.Core.DTOs.Exercises;
using BigBoss.Core.Enums;
using BigBoss.Core.Interfaces;
using BigBoss.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BigBoss.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ExercisesController : ControllerBase
{
    private readonly IExerciseService _exerciseService;
    private readonly IRedisCacheService _cache;
    private readonly ILogger<ExercisesController> _logger;

    public ExercisesController(IExerciseService exerciseService, IRedisCacheService cache, ILogger<ExercisesController> logger)
    {
        _exerciseService = exerciseService;
        _cache = cache;
        _logger = logger;
    }

    /// <summary>
    /// Get exercises with optional filters (cached 1h pour les requêtes sans filtre)
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ExerciseListResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<ExerciseListResponse>> GetExercises([FromQuery] ExerciseFilterRequest filter)
    {
        // Sprint 6.2 — cache uniquement pour les requêtes "défaut" sans filtre actif
        // (la plupart du trafic = liste générale). Avec filtres → on bypasse pour éviter explosion de clés.
        var canCache = string.IsNullOrEmpty(filter?.SearchQuery)
            && filter?.MuscleGroup == null
            && filter?.Equipment == null
            && filter?.Difficulty == null;

        if (canCache)
        {
            var cacheKey = $"exercises:list:p{filter?.Page ?? 1}:s{filter?.PageSize ?? 20}";
            var cached = await _cache.GetOrSetAsync(
                cacheKey,
                async () => await _exerciseService.GetExercisesAsync(filter ?? new ExerciseFilterRequest()),
                TimeSpan.FromHours(1)
            );
            return Ok(cached);
        }

        var result = await _exerciseService.GetExercisesAsync(filter ?? new ExerciseFilterRequest());
        return Ok(result);
    }

    /// <summary>
    /// Get exercise details with signed video URLs (cached 24h)
    /// </summary>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(ExerciseDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ExerciseDetailDto>> GetExerciseDetail(Guid id)
    {
        var userId = GetCurrentUserId();
        // Sprint 6.2 — cache détail 24h (ne change pas souvent, signed video URLs gérés séparément)
        var cacheKey = $"exercise:detail:{id}:u{userId}";
        var exercise = await _cache.GetOrSetAsync(
            cacheKey,
            async () => await _exerciseService.GetExerciseDetailAsync(id, userId),
            TimeSpan.FromHours(24)
        );

        if (exercise == null)
        {
            return NotFound();
        }

        return Ok(exercise);
    }

    /// <summary>
    /// Get exercises by muscle group
    /// </summary>
    [HttpGet("muscle-group/{muscleGroup}")]
    [ProducesResponseType(typeof(List<ExerciseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<ExerciseDto>>> GetByMuscleGroup(MuscleGroup muscleGroup)
    {
        var exercises = await _exerciseService.GetExercisesByMuscleGroupAsync(muscleGroup);
        return Ok(exercises);
    }

    /// <summary>
    /// Get alternative exercises for a given exercise
    /// </summary>
    [HttpGet("{id}/alternatives")]
    [ProducesResponseType(typeof(List<ExerciseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<ExerciseDto>>> GetAlternatives(Guid id, [FromQuery] Equipment? equipment = null)
    {
        var userId = GetCurrentUserId();
        var user = await GetUserEquipment(userId);
        var exercises = await _exerciseService.GetAlternativeExercisesAsync(id, equipment ?? user);
        return Ok(exercises);
    }

    /// <summary>
    /// Search exercises by name
    /// </summary>
    [HttpGet("search")]
    [ProducesResponseType(typeof(List<ExerciseDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<ExerciseDto>>> Search([FromQuery] string q, [FromQuery] int limit = 20)
    {
        if (string.IsNullOrWhiteSpace(q))
        {
            return Ok(new List<ExerciseDto>());
        }

        var exercises = await _exerciseService.SearchExercisesAsync(q, limit);
        return Ok(exercises);
    }

    /// <summary>
    /// Get signed video URL for an exercise
    /// </summary>
    [HttpGet("{id}/video/{videoType}")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetVideoUrl(Guid id, string videoType)
    {
        var url = await _exerciseService.GetSignedVideoUrlAsync(id, videoType);
        return Ok(new { url, expiresIn = 1800 });
    }

    /// <summary>
    /// Create a new exercise (Admin only)
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ExerciseAdminDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ExerciseAdminDto>> CreateExercise([FromBody] CreateExerciseDto dto)
    {
        try
        {
            var exercise = await _exerciseService.CreateExerciseAsync(dto);
            return CreatedAtAction(nameof(GetExerciseDetail), new { id = exercise.Id }, exercise);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Update an existing exercise (Admin only)
    /// </summary>
    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ExerciseAdminDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ExerciseAdminDto>> UpdateExercise(Guid id, [FromBody] UpdateExerciseDto dto)
    {
        try
        {
            var exercise = await _exerciseService.UpdateExerciseAsync(id, dto);
            if (exercise == null)
            {
                return NotFound(new { message = "Exercice non trouve" });
            }
            return Ok(exercise);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Delete an exercise (Admin only)
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteExercise(Guid id)
    {
        var success = await _exerciseService.DeleteExerciseAsync(id);
        if (!success)
        {
            return NotFound(new { message = "Exercice non trouve" });
        }
        return NoContent();
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim.Value, out var userId))
        {
            throw new UnauthorizedAccessException("User not authenticated");
        }
        return userId;
    }

    private async Task<Equipment> GetUserEquipment(Guid userId)
    {
        // TODO: Get from user service
        return Equipment.Barbell | Equipment.Dumbbell | Equipment.Bodyweight;
    }
}
