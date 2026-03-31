using BigBoss.Core.DTOs.Exercises;
using BigBoss.Core.Entities;
using BigBoss.Core.Enums;

namespace BigBoss.Core.Interfaces;

public interface IExerciseService
{
    Task<ExerciseListResponse> GetExercisesAsync(ExerciseFilterRequest filter);
    Task<ExerciseDetailDto?> GetExerciseDetailAsync(Guid exerciseId, Guid userId);
    Task<List<ExerciseDto>> GetExercisesByMuscleGroupAsync(MuscleGroup muscleGroup);
    Task<List<ExerciseDto>> GetAlternativeExercisesAsync(Guid exerciseId, Equipment availableEquipment);
    Task<List<ExerciseDto>> SearchExercisesAsync(string query, int limit = 20);
    Task<string> GetSignedVideoUrlAsync(Guid exerciseId, string videoType);

    // CRUD operations for admin
    Task<ExerciseAdminDto> CreateExerciseAsync(CreateExerciseDto dto);
    Task<ExerciseAdminDto?> UpdateExerciseAsync(Guid id, UpdateExerciseDto dto);
    Task<bool> DeleteExerciseAsync(Guid id);
    Task<ExerciseAdminDto?> GetExerciseForAdminAsync(Guid id);
}
