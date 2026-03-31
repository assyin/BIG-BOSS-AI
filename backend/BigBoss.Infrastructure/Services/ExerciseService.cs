using BigBoss.Core.DTOs.Exercises;
using BigBoss.Core.Enums;
using BigBoss.Core.Interfaces;
using BigBoss.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BigBoss.Infrastructure.Services;

public class ExerciseService : IExerciseService
{
    private readonly BigBossDbContext _context;
    private readonly ICloudflareService _cloudflareService;
    private readonly ILogger<ExerciseService> _logger;

    public ExerciseService(
        BigBossDbContext context,
        ICloudflareService cloudflareService,
        ILogger<ExerciseService> logger)
    {
        _context = context;
        _cloudflareService = cloudflareService;
        _logger = logger;
    }

    public async Task<ExerciseListResponse> GetExercisesAsync(ExerciseFilterRequest filter)
    {
        var query = _context.Exercises
            .AsNoTracking()
            .Where(e => e.IsActive);

        // Apply filters
        if (filter.MuscleGroup.HasValue)
        {
            query = query.Where(e => e.PrimaryMuscle == filter.MuscleGroup.Value ||
                                      e.Category == filter.MuscleGroup.Value);
        }

        if (filter.Difficulty.HasValue)
        {
            query = query.Where(e => e.Difficulty == filter.Difficulty.Value);
        }

        if (filter.Equipment.HasValue)
        {
            query = query.Where(e => (e.RequiredEquipment & filter.Equipment.Value) != 0 ||
                                      e.RequiredEquipment == Equipment.Bodyweight);
        }

        if (!string.IsNullOrWhiteSpace(filter.SearchQuery))
        {
            var searchLower = filter.SearchQuery.ToLower();
            query = query.Where(e =>
                e.NameFr.ToLower().Contains(searchLower) ||
                (e.NameEn != null && e.NameEn.ToLower().Contains(searchLower)) ||
                (e.NameAr != null && e.NameAr.Contains(searchLower)));
        }

        var totalCount = await query.CountAsync();

        var exercises = await query
            .OrderBy(e => e.NameFr)
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(e => new ExerciseDto(
                e.Id,
                e.NameFr,
                e.NameEn,
                e.NameAr,
                e.NameDarija,
                e.PrimaryMuscle.ToString(),
                e.Category.ToString(),
                e.Difficulty.ToString(),
                e.RequiredEquipment.ToString(),
                e.VideoDemoUrl,
                e.ThumbnailUrl ?? "",
                e.GifPreviewUrl,
                e.IsActive,
                e.HasVideo
            ))
            .ToListAsync();

        return new ExerciseListResponse(exercises, totalCount, filter.Page, filter.PageSize);
    }

    public async Task<ExerciseDetailDto?> GetExerciseDetailAsync(Guid exerciseId, Guid userId)
    {
        var exercise = await _context.Exercises
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == exerciseId && e.IsActive);

        if (exercise == null) return null;

        // Generate video URLs (local first, BunnyCDN fallback)
        var videos = new ExerciseVideosDto(
            DemoUrl: GetBestVideoUrl(exercise) ?? await GetSignedVideoUrlSafe(exercise.VideoDemoUrl),
            FormUrl: await GetSignedVideoUrlSafe(exercise.VideoFormUrl),
            MistakesUrl: await GetSignedVideoUrlSafe(exercise.VideoMistakesUrl),
            TipsUrl: await GetSignedVideoUrlSafe(exercise.VideoTipsUrl),
            ThumbnailUrl: exercise.ThumbnailUrl,
            GifPreviewUrl: exercise.GifPreviewUrl
        );

        return new ExerciseDetailDto(
            Id: exercise.Id,
            NameFr: exercise.NameFr,
            NameAr: exercise.NameAr,
            NameDarija: exercise.NameDarija,
            NameEn: exercise.NameEn,
            DescriptionFr: exercise.DescriptionFr,
            PrimaryMuscle: exercise.PrimaryMuscle.ToString(),
            SecondaryMuscles: exercise.SecondaryMuscles.Select(m => m.ToString()).ToList(),
            Category: exercise.Category.ToString(),
            Difficulty: exercise.Difficulty.ToString(),
            RequiredEquipment: GetEquipmentList(exercise.RequiredEquipment),
            Videos: videos,
            InstructionsFr: exercise.InstructionsFr,
            InstructionsEn: exercise.InstructionsEn,
            TipsCoachFr: exercise.TipsCoachFr,
            TipsEn: exercise.TipsEn,
            ErreursCourantesFr: exercise.ErreursCourantesFr,
            CoachingCues: exercise.CoachingCues,
            CommonMistakes: exercise.CommonMistakes,
            AlternativeExerciseIds: exercise.AlternativeExerciseIds,
            RepRanges: new RepRangesDto(
                new RepRangeDto(exercise.MinRepsHypertrophy, exercise.MaxRepsHypertrophy),
                new RepRangeDto(exercise.MinRepsStrength, exercise.MaxRepsStrength),
                new RepRangeDto(exercise.MinRepsEndurance, exercise.MaxRepsEndurance)
            ),
            RecommendedTempo: exercise.RecommendedTempo,
            ComplexityScore: exercise.ComplexityScore,
            Contraindications: exercise.Contraindications,
            HasVideo: exercise.HasVideo,
            IsActive: exercise.IsActive
        );
    }

    public async Task<List<ExerciseDto>> GetExercisesByMuscleGroupAsync(MuscleGroup muscleGroup)
    {
        return await _context.Exercises
            .AsNoTracking()
            .Where(e => e.IsActive && (e.PrimaryMuscle == muscleGroup || e.Category == muscleGroup))
            .OrderBy(e => e.Difficulty)
            .ThenBy(e => e.NameFr)
            .Select(e => new ExerciseDto(
                e.Id,
                e.NameFr,
                e.NameEn,
                e.NameAr,
                e.NameDarija,
                e.PrimaryMuscle.ToString(),
                e.Category.ToString(),
                e.Difficulty.ToString(),
                e.RequiredEquipment.ToString(),
                e.VideoDemoUrl,
                e.ThumbnailUrl ?? "",
                e.GifPreviewUrl,
                e.IsActive,
                e.HasVideo
            ))
            .ToListAsync();
    }

    public async Task<List<ExerciseDto>> GetAlternativeExercisesAsync(Guid exerciseId, Equipment availableEquipment)
    {
        var exercise = await _context.Exercises.FindAsync(exerciseId);
        if (exercise == null) return new List<ExerciseDto>();

        return await _context.Exercises
            .AsNoTracking()
            .Where(e => e.IsActive &&
                        e.Id != exerciseId &&
                        e.PrimaryMuscle == exercise.PrimaryMuscle &&
                        ((e.RequiredEquipment & availableEquipment) != 0 || e.RequiredEquipment == Equipment.Bodyweight))
            .OrderBy(e => e.Difficulty)
            .Take(5)
            .Select(e => new ExerciseDto(
                e.Id,
                e.NameFr,
                e.NameEn,
                e.NameAr,
                e.NameDarija,
                e.PrimaryMuscle.ToString(),
                e.Category.ToString(),
                e.Difficulty.ToString(),
                e.RequiredEquipment.ToString(),
                e.VideoDemoUrl,
                e.ThumbnailUrl ?? "",
                e.GifPreviewUrl,
                e.IsActive,
                e.HasVideo
            ))
            .ToListAsync();
    }

    public async Task<List<ExerciseDto>> SearchExercisesAsync(string query, int limit = 20)
    {
        var searchLower = query.ToLower();

        return await _context.Exercises
            .AsNoTracking()
            .Where(e => e.IsActive &&
                        (e.NameFr.ToLower().Contains(searchLower) ||
                         (e.NameEn != null && e.NameEn.ToLower().Contains(searchLower))))
            .Take(limit)
            .Select(e => new ExerciseDto(
                e.Id,
                e.NameFr,
                e.NameEn,
                e.NameAr,
                e.NameDarija,
                e.PrimaryMuscle.ToString(),
                e.Category.ToString(),
                e.Difficulty.ToString(),
                e.RequiredEquipment.ToString(),
                e.VideoDemoUrl,
                e.ThumbnailUrl ?? "",
                e.GifPreviewUrl,
                e.IsActive,
                e.HasVideo
            ))
            .ToListAsync();
    }

    public async Task<string> GetSignedVideoUrlAsync(Guid exerciseId, string videoType)
    {
        var exercise = await _context.Exercises.FindAsync(exerciseId);
        if (exercise == null) throw new KeyNotFoundException("Exercice non trouve");

        var videoKey = videoType.ToLower() switch
        {
            "demo" => exercise.VideoDemoUrl,
            "form" => exercise.VideoFormUrl,
            "mistakes" => exercise.VideoMistakesUrl,
            "tips" => exercise.VideoTipsUrl,
            _ => throw new ArgumentException("Type de video invalide")
        };

        if (string.IsNullOrEmpty(videoKey))
        {
            throw new KeyNotFoundException("Video non disponible");
        }

        return await _cloudflareService.GetSignedUrlAsync(videoKey);
    }

    private Task<string?> GetSignedVideoUrlSafe(string? videoUrl)
    {
        if (string.IsNullOrEmpty(videoUrl)) return Task.FromResult<string?>(null);

        // Local path (served by static files middleware)
        if (videoUrl.StartsWith("/videos/"))
        {
            return Task.FromResult<string?>(videoUrl);
        }

        // Full external URL (BunnyCDN, etc.)
        if (videoUrl.StartsWith("http://") || videoUrl.StartsWith("https://"))
        {
            return Task.FromResult<string?>(videoUrl);
        }

        // Cloudflare R2
        try
        {
            return _cloudflareService.GetSignedUrlAsync(videoUrl)!;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to get signed URL for video: {VideoUrl}", videoUrl);
            return Task.FromResult<string?>(null);
        }
    }

    /// <summary>
    /// Returns the best available video URL: local path first, then BunnyCDN fallback
    /// </summary>
    private string? GetBestVideoUrl(Core.Entities.Exercise exercise)
    {
        // Priority 1: Local file
        if (!string.IsNullOrEmpty(exercise.VideoLocalPath))
            return exercise.VideoLocalPath;

        // Priority 2: Direct URL (could be BunnyCDN or other)
        if (!string.IsNullOrEmpty(exercise.VideoDemoUrl))
            return exercise.VideoDemoUrl;

        // Priority 3: BunnyCDN fallback
        if (!string.IsNullOrEmpty(exercise.VideoBunnyUrl))
            return exercise.VideoBunnyUrl;

        return null;
    }

    private List<string> GetEquipmentList(Equipment equipment)
    {
        var list = new List<string>();
        foreach (Equipment value in Enum.GetValues(typeof(Equipment)))
        {
            if (value != Equipment.None && (equipment & value) == value)
            {
                list.Add(value.ToString());
            }
        }
        return list;
    }

    public async Task<ExerciseAdminDto> CreateExerciseAsync(CreateExerciseDto dto)
    {
        var exercise = new Core.Entities.Exercise
        {
            Id = Guid.NewGuid(),
            NameFr = dto.NameFr,
            NameEn = dto.NameEn,
            NameAr = dto.NameAr,
            NameDarija = dto.NameDarija,
            DescriptionFr = dto.DescriptionFr,
            PrimaryMuscle = Enum.Parse<MuscleGroup>(dto.PrimaryMuscle),
            SecondaryMuscles = dto.SecondaryMuscles?.Select(m => Enum.Parse<MuscleGroup>(m)).ToList() ?? new List<MuscleGroup>(),
            Category = Enum.Parse<MuscleGroup>(dto.PrimaryMuscle),
            Difficulty = Enum.Parse<DifficultyLevel>(dto.Difficulty),
            RequiredEquipment = Enum.Parse<Equipment>(dto.RequiredEquipment),
            VideoDemoUrl = dto.VideoDemoUrl,
            ThumbnailUrl = dto.ThumbnailUrl,
            InstructionsEn = dto.InstructionsEn ?? new List<string>(),
            InstructionsFr = dto.InstructionsFr ?? new List<string>(),
            TipsEn = dto.TipsEn ?? new List<string>(),
            TipsCoachFr = dto.TipsCoachFr ?? new List<string>(),
            ErreursCourantesFr = dto.ErreursCourantesFr ?? new List<string>(),
            CoachingCues = dto.CoachingCues ?? new List<string>(),
            CommonMistakes = dto.CommonMistakes ?? new List<string>(),
            IsActive = dto.IsActive,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Exercises.Add(exercise);
        await _context.SaveChangesAsync();

        return MapToAdminDto(exercise);
    }

    public async Task<ExerciseAdminDto?> UpdateExerciseAsync(Guid id, UpdateExerciseDto dto)
    {
        var exercise = await _context.Exercises.FindAsync(id);
        if (exercise == null) return null;

        exercise.NameFr = dto.NameFr;
        exercise.NameEn = dto.NameEn;
        exercise.NameAr = dto.NameAr;
        exercise.NameDarija = dto.NameDarija;
        exercise.DescriptionFr = dto.DescriptionFr;
        exercise.PrimaryMuscle = Enum.Parse<MuscleGroup>(dto.PrimaryMuscle);
        exercise.SecondaryMuscles = dto.SecondaryMuscles?.Select(m => Enum.Parse<MuscleGroup>(m)).ToList() ?? new List<MuscleGroup>();
        exercise.Category = Enum.Parse<MuscleGroup>(dto.PrimaryMuscle);
        exercise.Difficulty = Enum.Parse<DifficultyLevel>(dto.Difficulty);
        exercise.RequiredEquipment = Enum.Parse<Equipment>(dto.RequiredEquipment);
        exercise.VideoDemoUrl = dto.VideoDemoUrl;
        exercise.ThumbnailUrl = dto.ThumbnailUrl;
        exercise.InstructionsEn = dto.InstructionsEn ?? exercise.InstructionsEn;
        exercise.InstructionsFr = dto.InstructionsFr ?? exercise.InstructionsFr;
        exercise.TipsEn = dto.TipsEn ?? exercise.TipsEn;
        exercise.TipsCoachFr = dto.TipsCoachFr ?? exercise.TipsCoachFr;
        exercise.ErreursCourantesFr = dto.ErreursCourantesFr ?? exercise.ErreursCourantesFr;
        exercise.CoachingCues = dto.CoachingCues ?? exercise.CoachingCues;
        exercise.CommonMistakes = dto.CommonMistakes ?? exercise.CommonMistakes;
        exercise.IsActive = dto.IsActive;
        exercise.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return MapToAdminDto(exercise);
    }

    public async Task<bool> DeleteExerciseAsync(Guid id)
    {
        var exercise = await _context.Exercises.FindAsync(id);
        if (exercise == null) return false;

        _context.Exercises.Remove(exercise);
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<ExerciseAdminDto?> GetExerciseForAdminAsync(Guid id)
    {
        var exercise = await _context.Exercises.FindAsync(id);
        if (exercise == null) return null;

        return MapToAdminDto(exercise);
    }

    private ExerciseAdminDto MapToAdminDto(Core.Entities.Exercise exercise)
    {
        return new ExerciseAdminDto(
            Id: exercise.Id,
            NameFr: exercise.NameFr,
            NameEn: exercise.NameEn,
            NameAr: exercise.NameAr,
            NameDarija: exercise.NameDarija,
            DescriptionFr: exercise.DescriptionFr,
            PrimaryMuscle: exercise.PrimaryMuscle.ToString(),
            SecondaryMuscles: exercise.SecondaryMuscles.Select(m => m.ToString()).ToList(),
            Difficulty: exercise.Difficulty.ToString(),
            RequiredEquipment: exercise.RequiredEquipment.ToString(),
            VideoDemoUrl: exercise.VideoDemoUrl,
            ThumbnailUrl: exercise.ThumbnailUrl,
            InstructionsEn: exercise.InstructionsEn,
            InstructionsFr: exercise.InstructionsFr,
            TipsEn: exercise.TipsEn,
            TipsCoachFr: exercise.TipsCoachFr,
            ErreursCourantesFr: exercise.ErreursCourantesFr,
            CoachingCues: exercise.CoachingCues,
            CommonMistakes: exercise.CommonMistakes,
            IsActive: exercise.IsActive,
            HasVideo: exercise.HasVideo,
            CreatedAt: exercise.CreatedAt,
            UpdatedAt: exercise.UpdatedAt
        );
    }
}
