using BigBoss.Core.Enums;

namespace BigBoss.Core.DTOs.Users;

public record UserProfileDto(
    Guid Id,
    string Email,
    string Name,
    string? Phone,
    DateTime? BirthDate,
    string? AvatarUrl,
    decimal? WeightKg,
    decimal? HeightCm,
    string? Gender,
    string Goal,
    string Level,
    string SubscriptionTier,
    DateTime? SubscriptionExpiresAt,
    string PreferredLanguage,
    bool NotificationsEnabled,
    DateTime CreatedAt,
    UserStatsDto Stats,
    // New onboarding fields
    decimal? WaistCm = null,
    decimal? BodyFatPercent = null,
    decimal? TargetWeightKg = null,
    DateTime? TargetDate = null,
    int TrainingFrequency = 3,
    int PreferredDuration = 60,
    List<string>? PreferredDays = null,
    string? PreferredTime = null,
    List<string>? Injuries = null,
    List<string>? MedicalConditions = null,
    List<string>? FoodAllergies = null,
    string DietType = "omnivore",
    int MealsPerDay = 3,
    List<string>? PreferredCuisines = null,
    bool IsRamadanMode = false,
    string ActivityLevel = "moderate",
    int? SleepHours = null,
    int? StressLevel = null,
    List<string>? MotivationReasons = null,
    List<string>? PreviousBlockers = null,
    string CoachTonePreference = "motivant",
    decimal? Bmr = null,
    decimal? Tdee = null,
    decimal? DailyCalorieTarget = null,
    decimal? DailyProteinTarget = null,
    decimal? DailyCarbTarget = null,
    decimal? DailyFatTarget = null,
    string? RecommendedSplit = null,
    bool OnboardingCompleted = false,
    DateTime? OnboardingCompletedAt = null
);

public record UserStatsDto(
    int TotalSessions,
    int TotalExercisesCompleted,
    decimal TotalVolumeKg,
    int CurrentStreak,
    int LongestStreak,
    int PersonalRecordsCount
);
