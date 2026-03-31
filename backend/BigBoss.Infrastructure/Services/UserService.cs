using BigBoss.Core.DTOs.Users;
using BigBoss.Core.Entities;
using BigBoss.Core.Enums;
using BigBoss.Core.Interfaces;
using BigBoss.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BigBoss.Infrastructure.Services;

public class UserService : IUserService
{
    private readonly BigBossDbContext _context;
    private readonly ILogger<UserService> _logger;

    public UserService(BigBossDbContext context, ILogger<UserService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<UserProfileDto?> GetProfileAsync(Guid userId)
    {
        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null) return null;

        var stats = await GetStatsAsync(userId);

        return new UserProfileDto(
            Id: user.Id,
            Email: user.Email,
            Name: user.Name,
            Phone: user.Phone,
            BirthDate: user.BirthDate,
            AvatarUrl: user.AvatarUrl,
            WeightKg: user.WeightKg,
            HeightCm: user.HeightCm,
            Gender: user.Gender,
            Goal: user.Goal.ToString(),
            Level: user.Level.ToString(),
            SubscriptionTier: user.SubscriptionTier.ToString(),
            SubscriptionExpiresAt: user.SubscriptionExpiresAt,
            PreferredLanguage: user.PreferredLanguage,
            NotificationsEnabled: user.NotificationsEnabled,
            CreatedAt: user.CreatedAt,
            Stats: stats,
            WaistCm: user.WaistCm,
            BodyFatPercent: user.BodyFatPercent,
            TargetWeightKg: user.TargetWeightKg,
            TargetDate: user.TargetDate,
            TrainingFrequency: user.TrainingFrequency,
            PreferredDuration: user.PreferredDuration,
            PreferredDays: user.PreferredDays,
            PreferredTime: user.PreferredTime,
            Injuries: user.Injuries,
            MedicalConditions: user.MedicalConditions,
            FoodAllergies: user.FoodAllergies,
            DietType: user.DietType,
            MealsPerDay: user.MealsPerDay,
            PreferredCuisines: user.PreferredCuisines,
            IsRamadanMode: user.IsRamadanMode,
            ActivityLevel: user.ActivityLevel,
            SleepHours: user.SleepHours,
            StressLevel: user.StressLevel,
            MotivationReasons: user.MotivationReasons,
            PreviousBlockers: user.PreviousBlockers,
            CoachTonePreference: user.CoachTonePreference,
            Bmr: user.Bmr,
            Tdee: user.Tdee,
            DailyCalorieTarget: user.DailyCalorieTarget,
            DailyProteinTarget: user.DailyProteinTarget,
            DailyCarbTarget: user.DailyCarbTarget,
            DailyFatTarget: user.DailyFatTarget,
            RecommendedSplit: user.RecommendedSplit,
            OnboardingCompleted: user.OnboardingCompleted,
            OnboardingCompletedAt: user.OnboardingCompletedAt
        );
    }

    public async Task<UserProfileDto> UpdateProfileAsync(Guid userId, UpdateProfileRequest request)
    {
        var user = await _context.Users.FindAsync(userId);

        if (user == null)
        {
            throw new KeyNotFoundException("Utilisateur non trouve");
        }

        // Update only provided fields
        if (request.Name != null) user.Name = request.Name;
        if (request.Phone != null) user.Phone = request.Phone;
        if (request.BirthDate.HasValue) user.BirthDate = request.BirthDate;
        if (request.WeightKg.HasValue) user.WeightKg = request.WeightKg;
        if (request.HeightCm.HasValue) user.HeightCm = request.HeightCm;
        if (request.Gender != null) user.Gender = request.Gender;
        if (request.Goal.HasValue) user.Goal = request.Goal.Value;
        if (request.Level.HasValue) user.Level = request.Level.Value;
        if (request.AvailableEquipment.HasValue) user.AvailableEquipment = request.AvailableEquipment.Value;
        if (request.PreferredLanguage != null) user.PreferredLanguage = request.PreferredLanguage;
        if (request.NotificationsEnabled.HasValue) user.NotificationsEnabled = request.NotificationsEnabled.Value;

        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Profile updated for user: {UserId}", userId);

        return (await GetProfileAsync(userId))!;
    }

    public async Task<User?> GetByIdAsync(Guid userId)
    {
        return await _context.Users.FindAsync(userId);
    }

    public async Task<User?> GetByEmailAsync(string email)
    {
        return await _context.Users
            .FirstOrDefaultAsync(u => u.Email == email.ToLower());
    }

    public async Task<bool> UpdateAvatarAsync(Guid userId, string avatarUrl)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return false;

        user.AvatarUrl = avatarUrl;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAccountAsync(Guid userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return false;

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Account deleted for user: {UserId}", userId);
        return true;
    }

    public async Task<UserProfileDto> CompleteOnboardingAsync(Guid userId, OnboardingRequest request)
    {
        var user = await _context.Users.FindAsync(userId);

        if (user == null)
        {
            throw new KeyNotFoundException("Utilisateur non trouve");
        }

        // Step 1: Identity
        if (request.Name != null) user.Name = request.Name;
        if (request.BirthDate.HasValue) user.BirthDate = DateTime.SpecifyKind(request.BirthDate.Value, DateTimeKind.Utc);
        if (request.Gender != null) user.Gender = request.Gender;

        // Step 2: Measurements
        if (request.WeightKg.HasValue) user.WeightKg = request.WeightKg;
        if (request.HeightCm.HasValue) user.HeightCm = request.HeightCm;
        if (request.WaistCm.HasValue) user.WaistCm = request.WaistCm;
        if (request.BodyFatPercent.HasValue) user.BodyFatPercent = request.BodyFatPercent;

        // Step 3: Goal
        if (request.Goal.HasValue) user.Goal = (UserGoal)request.Goal.Value;

        // Step 4: Level
        if (request.Level.HasValue) user.Level = (DifficultyLevel)request.Level.Value;

        // Step 5: Frequency
        if (request.TrainingFrequency.HasValue) user.TrainingFrequency = request.TrainingFrequency.Value;
        if (request.PreferredDuration.HasValue) user.PreferredDuration = request.PreferredDuration.Value;
        if (request.PreferredDays != null) user.PreferredDays = request.PreferredDays;
        if (request.PreferredTime != null) user.PreferredTime = request.PreferredTime;

        // Step 6: Equipment
        if (request.AvailableEquipment.HasValue) user.AvailableEquipment = (Equipment)request.AvailableEquipment.Value;

        // Step 7: Health
        if (request.Injuries != null) user.Injuries = request.Injuries;
        if (request.MedicalConditions != null) user.MedicalConditions = request.MedicalConditions;
        if (request.FoodAllergies != null) user.FoodAllergies = request.FoodAllergies;

        // Step 8: Diet
        if (request.DietType != null) user.DietType = request.DietType;
        if (request.MealsPerDay.HasValue) user.MealsPerDay = request.MealsPerDay.Value;
        if (request.PreferredCuisines != null) user.PreferredCuisines = request.PreferredCuisines;
        if (request.IsRamadanMode.HasValue) user.IsRamadanMode = request.IsRamadanMode.Value;

        // Step 9: Lifestyle
        if (request.ActivityLevel != null) user.ActivityLevel = request.ActivityLevel;
        if (request.SleepHours.HasValue) user.SleepHours = request.SleepHours;
        if (request.StressLevel.HasValue) user.StressLevel = request.StressLevel;

        // Step 10: Targets
        if (request.TargetWeightKg.HasValue) user.TargetWeightKg = request.TargetWeightKg;
        if (request.TargetDate.HasValue) user.TargetDate = DateTime.SpecifyKind(request.TargetDate.Value, DateTimeKind.Utc);

        // Step 11: Preferences
        if (request.PreferredLanguage != null) user.PreferredLanguage = request.PreferredLanguage;
        if (request.NotificationsEnabled.HasValue) user.NotificationsEnabled = request.NotificationsEnabled.Value;

        // Step 12: Motivation
        if (request.MotivationReasons != null) user.MotivationReasons = request.MotivationReasons;
        if (request.PreviousBlockers != null) user.PreviousBlockers = request.PreviousBlockers;
        if (request.CoachTonePreference != null) user.CoachTonePreference = request.CoachTonePreference;

        // Calculate BMR, TDEE, macros
        CalculateNutritionTargets(user);

        // Determine recommended split
        user.RecommendedSplit = user.TrainingFrequency switch
        {
            <= 3 => "Full Body",
            4 => "Upper/Lower",
            5 => "Push/Pull/Legs",
            >= 6 => "PPL x2"
        };

        // Mark onboarding complete
        user.OnboardingCompleted = true;
        user.OnboardingCompletedAt = DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Onboarding completed for user: {UserId}", userId);

        return (await GetProfileAsync(userId))!;
    }

    private void CalculateNutritionTargets(User user)
    {
        if (!user.WeightKg.HasValue || !user.HeightCm.HasValue || !user.BirthDate.HasValue || user.Gender == null)
        {
            return;
        }

        var weight = user.WeightKg.Value;
        var height = user.HeightCm.Value;
        var age = (decimal)(DateTime.UtcNow.Year - user.BirthDate.Value.Year);
        if (user.BirthDate.Value.Date > DateTime.UtcNow.AddYears(-(int)age)) age--;

        // Harris-Benedict BMR
        user.Bmr = user.Gender.ToLower() switch
        {
            "male" => 88.362m + (13.397m * weight) + (4.799m * height) - (5.677m * age),
            "female" => 447.593m + (9.247m * weight) + (3.098m * height) - (4.330m * age),
            _ => 88.362m + (13.397m * weight) + (4.799m * height) - (5.677m * age) // default to male formula
        };

        // Activity multiplier
        var multiplier = user.ActivityLevel?.ToLower() switch
        {
            "sedentary" => 1.2m,
            "light" => 1.375m,
            "moderate" => 1.55m,
            "active" => 1.725m,
            "extreme" => 1.9m,
            _ => 1.55m
        };

        user.Tdee = Math.Round(user.Bmr.Value * multiplier, 0);

        // Goal adjustment
        user.DailyCalorieTarget = user.Goal switch
        {
            UserGoal.LoseFat => user.Tdee - 500,
            UserGoal.BuildMuscle => user.Tdee + 300,
            UserGoal.BuildStrength => user.Tdee + 200,
            UserGoal.Endurance => user.Tdee - 100,
            UserGoal.Maintenance => user.Tdee,
            UserGoal.Recomposition => user.Tdee,
            _ => user.Tdee
        };

        // Macros
        user.DailyProteinTarget = Math.Round(2m * weight, 0);
        user.DailyFatTarget = Math.Round(1m * weight, 0);

        var proteinCalories = user.DailyProteinTarget.Value * 4m;
        var fatCalories = user.DailyFatTarget.Value * 9m;
        var remainingCalories = user.DailyCalorieTarget.Value - proteinCalories - fatCalories;
        user.DailyCarbTarget = Math.Round(Math.Max(0, remainingCalories / 4m), 0);

        user.Bmr = Math.Round(user.Bmr.Value, 0);
    }

    public async Task<UserStatsDto> GetStatsAsync(Guid userId)
    {
        var totalSessions = await _context.Sessions
            .CountAsync(s => s.UserId == userId && s.Status == SessionStatus.Completed);

        var totalExercises = await _context.SessionExercises
            .CountAsync(se => se.Session.UserId == userId && se.IsCompleted);

        var totalVolume = await _context.Sessions
            .Where(s => s.UserId == userId && s.Status == SessionStatus.Completed)
            .SumAsync(s => s.TotalVolumeKg ?? 0);

        // Calculate streak
        var sessions = await _context.Sessions
            .Where(s => s.UserId == userId && s.Status == SessionStatus.Completed)
            .OrderByDescending(s => s.CompletedAt)
            .Select(s => s.CompletedAt!.Value.Date)
            .Distinct()
            .Take(365)
            .ToListAsync();

        var currentStreak = CalculateCurrentStreak(sessions);
        var longestStreak = CalculateLongestStreak(sessions);

        // Count PRs (simplified - count sessions then filter in memory)
        var prCount = await _context.Sessions
            .Where(s => s.UserId == userId && s.Status == SessionStatus.Completed)
            .Select(s => s.PersonalRecords)
            .ToListAsync();
        var totalPRs = prCount.Count(pr => pr != null && pr.Count > 0);

        return new UserStatsDto(
            TotalSessions: totalSessions,
            TotalExercisesCompleted: totalExercises,
            TotalVolumeKg: totalVolume,
            CurrentStreak: currentStreak,
            LongestStreak: longestStreak,
            PersonalRecordsCount: totalPRs
        );
    }

    private int CalculateCurrentStreak(List<DateTime> sessionDates)
    {
        if (!sessionDates.Any()) return 0;

        var streak = 0;
        var today = DateTime.UtcNow.Date;
        var checkDate = today;

        // Allow for today or yesterday to be the start
        if (sessionDates.First() != today && sessionDates.First() != today.AddDays(-1))
        {
            return 0;
        }

        foreach (var date in sessionDates)
        {
            if (date == checkDate || date == checkDate.AddDays(-1))
            {
                streak++;
                checkDate = date.AddDays(-1);
            }
            else
            {
                break;
            }
        }

        return streak;
    }

    private int CalculateLongestStreak(List<DateTime> sessionDates)
    {
        if (!sessionDates.Any()) return 0;

        var orderedDates = sessionDates.OrderBy(d => d).ToList();
        var maxStreak = 1;
        var currentStreak = 1;

        for (int i = 1; i < orderedDates.Count; i++)
        {
            if ((orderedDates[i] - orderedDates[i - 1]).Days == 1)
            {
                currentStreak++;
                maxStreak = Math.Max(maxStreak, currentStreak);
            }
            else if ((orderedDates[i] - orderedDates[i - 1]).Days > 1)
            {
                currentStreak = 1;
            }
        }

        return maxStreak;
    }
}
