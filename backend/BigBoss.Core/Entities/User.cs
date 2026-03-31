using BigBoss.Core.Enums;

namespace BigBoss.Core.Entities;

public class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public DateTime? BirthDate { get; set; }
    public string? AvatarUrl { get; set; }

    // Physical stats
    public decimal? WeightKg { get; set; }
    public decimal? HeightCm { get; set; }
    public string? Gender { get; set; }

    // Fitness profile
    public UserGoal Goal { get; set; } = UserGoal.BuildMuscle;
    public DifficultyLevel Level { get; set; } = DifficultyLevel.Beginner;
    public Equipment AvailableEquipment { get; set; } = Equipment.None;

    // Role
    public UserRole Role { get; set; } = UserRole.User;

    // Subscription
    public SubscriptionTier SubscriptionTier { get; set; } = SubscriptionTier.Free;
    public DateTime? SubscriptionExpiresAt { get; set; }

    // Mensurations
    public decimal? WaistCm { get; set; }
    public decimal? BodyFatPercent { get; set; }

    // Objectifs
    public decimal? TargetWeightKg { get; set; }
    public DateTime? TargetDate { get; set; }

    // Entrainement
    public int TrainingFrequency { get; set; } = 3;
    public int PreferredDuration { get; set; } = 60;
    public List<string> PreferredDays { get; set; } = new();
    public string? PreferredTime { get; set; }

    // Sante
    public List<string> Injuries { get; set; } = new();
    public List<string> MedicalConditions { get; set; } = new();
    public List<string> FoodAllergies { get; set; } = new();

    // Alimentation
    public string DietType { get; set; } = "omnivore";
    public int MealsPerDay { get; set; } = 3;
    public List<string> PreferredCuisines { get; set; } = new();
    public bool IsRamadanMode { get; set; }

    // Mode de vie
    public string ActivityLevel { get; set; } = "moderate";
    public int? SleepHours { get; set; }
    public int? StressLevel { get; set; }

    // Motivation
    public List<string> MotivationReasons { get; set; } = new();
    public List<string> PreviousBlockers { get; set; } = new();
    public string CoachTonePreference { get; set; } = "motivant";

    // Calculs auto
    public decimal? Bmr { get; set; }
    public decimal? Tdee { get; set; }
    public decimal? DailyCalorieTarget { get; set; }
    public decimal? DailyProteinTarget { get; set; }
    public decimal? DailyCarbTarget { get; set; }
    public decimal? DailyFatTarget { get; set; }
    public string? RecommendedSplit { get; set; }
    public bool OnboardingCompleted { get; set; }
    public DateTime? OnboardingCompletedAt { get; set; }

    // Preferences
    public string PreferredLanguage { get; set; } = "fr";
    public bool NotificationsEnabled { get; set; } = true;

    // Timestamps
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }

    // Refresh token
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiresAt { get; set; }

    // Navigation properties
    public virtual ICollection<Session> Sessions { get; set; } = new List<Session>();
    public virtual ICollection<Meal> Meals { get; set; } = new List<Meal>();
    public virtual ICollection<BodyStat> BodyStats { get; set; } = new List<BodyStat>();
    public virtual ICollection<ProgressPhoto> ProgressPhotos { get; set; } = new List<ProgressPhoto>();
    public virtual ICollection<CoachMessage> CoachMessages { get; set; } = new List<CoachMessage>();
    public virtual ICollection<Programme> Programmes { get; set; } = new List<Programme>();
}
