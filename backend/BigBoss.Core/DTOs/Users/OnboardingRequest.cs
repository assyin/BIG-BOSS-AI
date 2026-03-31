namespace BigBoss.Core.DTOs.Users;

public class OnboardingRequest
{
    // Step 1: Identity
    public string? Name { get; set; }
    public DateTime? BirthDate { get; set; }
    public string? Gender { get; set; }

    // Step 2: Measurements
    public decimal? WeightKg { get; set; }
    public decimal? HeightCm { get; set; }
    public decimal? WaistCm { get; set; }
    public decimal? BodyFatPercent { get; set; }

    // Step 3: Goal
    public int? Goal { get; set; }

    // Step 4: Level
    public int? Level { get; set; }

    // Step 5: Frequency
    public int? TrainingFrequency { get; set; }
    public int? PreferredDuration { get; set; }
    public List<string>? PreferredDays { get; set; }
    public string? PreferredTime { get; set; }

    // Step 6: Equipment
    public int? AvailableEquipment { get; set; }

    // Step 7: Health
    public List<string>? Injuries { get; set; }
    public List<string>? MedicalConditions { get; set; }
    public List<string>? FoodAllergies { get; set; }

    // Step 8: Diet
    public string? DietType { get; set; }
    public int? MealsPerDay { get; set; }
    public List<string>? PreferredCuisines { get; set; }
    public bool? IsRamadanMode { get; set; }

    // Step 9: Lifestyle
    public string? ActivityLevel { get; set; }
    public int? SleepHours { get; set; }
    public int? StressLevel { get; set; }

    // Step 10: Targets
    public decimal? TargetWeightKg { get; set; }
    public DateTime? TargetDate { get; set; }

    // Step 11: Preferences
    public string? PreferredLanguage { get; set; }
    public bool? NotificationsEnabled { get; set; }

    // Step 12: Motivation
    public List<string>? MotivationReasons { get; set; }
    public List<string>? PreviousBlockers { get; set; }
    public string? CoachTonePreference { get; set; }
}
