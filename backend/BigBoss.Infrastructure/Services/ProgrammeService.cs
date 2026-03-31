using System.Text.Json;
using BigBoss.Core.Entities;
using BigBoss.Core.Enums;
using BigBoss.Core.Interfaces;
using BigBoss.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BigBoss.Infrastructure.Services;

public class ProgrammeService : IProgrammeService
{
    private readonly BigBossDbContext _context;
    private readonly ILogger<ProgrammeService> _logger;

    public ProgrammeService(BigBossDbContext context, ILogger<ProgrammeService> logger)
    {
        _context = context;
        _logger = logger;
    }

    // ──────────────────────────────────────────────────────────────
    //  GENERATE
    // ──────────────────────────────────────────────────────────────

    public async Task<Programme> GenerateProgrammeAsync(Guid userId)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId)
            ?? throw new KeyNotFoundException("Utilisateur non trouve");

        // Abandon any existing active programme
        var existing = await _context.Programmes
            .FirstOrDefaultAsync(p => p.UserId == userId && p.Status == ProgrammeStatus.Active);
        if (existing != null)
        {
            existing.Status = ProgrammeStatus.Abandoned;
            existing.EndDate = DateTime.UtcNow;
        }

        // 1. Determine split based on training frequency
        var split = DetermineSplit(user.TrainingFrequency);
        var durationWeeks = DetermineDuration(user.Goal);
        var programmeType = MapGoalToType(user.Goal);
        var daysPerWeek = Math.Min(user.TrainingFrequency, 6);

        // 2. Build preferred days schedule (0=Mon .. 6=Sun)
        var trainingDays = ResolveTrainingDays(user.PreferredDays, daysPerWeek);

        // 3. Create Programme
        var programme = new Programme
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Title = BuildProgrammeTitle(programmeType, split, user.Level),
            Description = BuildProgrammeDescription(programmeType, split, durationWeeks, user),
            Type = programmeType,
            DurationWeeks = durationWeeks,
            CurrentWeek = 1,
            Split = split,
            DailyCalories = (int)(user.DailyCalorieTarget ?? 2200),
            DailyProtein = user.DailyProteinTarget ?? 150,
            DailyCarbs = user.DailyCarbTarget ?? 250,
            DailyFat = user.DailyFatTarget ?? 70,
            Status = ProgrammeStatus.Active,
            StartDate = DateTime.UtcNow.Date,
            TotalSessions = durationWeeks * daysPerWeek,
            ProgressPercent = 0
        };

        // 4. Build weekly schedule JSON
        programme.WeeklyScheduleJson = JsonSerializer.Serialize(trainingDays.Select((day, i) =>
            new { dayOfWeek = day, order = i, muscles = GetMusclesForDay(split, i, daysPerWeek) }));

        _context.Programmes.Add(programme);

        // 5. Generate all ProgrammeSessions across all weeks
        var allExercises = await _context.Exercises
            .Where(e => e.IsActive)
            .ToListAsync();

        var userEquipment = user.AvailableEquipment;
        var userInjuries = user.Injuries ?? new List<string>();

        for (int week = 1; week <= durationWeeks; week++)
        {
            for (int dayIndex = 0; dayIndex < trainingDays.Count; dayIndex++)
            {
                var dayOfWeek = trainingDays[dayIndex];
                var targetMuscles = GetMusclesForDay(split, dayIndex, daysPerWeek);
                var plannedDate = CalculatePlannedDate(programme.StartDate, week, dayOfWeek);

                // Select exercises
                var selectedExercises = SelectExercises(
                    allExercises, targetMuscles, userEquipment, userInjuries, user.Goal, user.Level, week);

                // Build exercises JSON
                var exercisesPayload = selectedExercises.Select(ex =>
                {
                    var (sets, reps, rest) = GetSetsRepsRest(user.Goal, user.Level, ex, week, durationWeeks);
                    return new
                    {
                        exerciseId = ex.Id,
                        name = ex.NameFr,
                        sets,
                        reps,
                        weightKg = (decimal?)null,
                        restSeconds = rest
                    };
                }).ToList();

                var dayTitle = BuildDayTitle(split, dayIndex, targetMuscles, dayOfWeek);

                var ps = new ProgrammeSession
                {
                    Id = Guid.NewGuid(),
                    ProgrammeId = programme.Id,
                    WeekNumber = week,
                    DayOfWeek = dayOfWeek,
                    PlannedDate = plannedDate,
                    Title = dayTitle,
                    MuscleGroups = targetMuscles.Select(m => m.ToString()).ToList(),
                    ExercisesJson = JsonSerializer.Serialize(exercisesPayload),
                    EstimatedDuration = user.PreferredDuration,
                    OrderInWeek = dayIndex,
                    Status = ProgrammeSessionStatus.Planned
                };

                _context.ProgrammeSessions.Add(ps);
            }
        }

        // 6. Generate meal plan
        programme.MealPlanJson = await GenerateMealPlanJsonAsync(user);

        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Programme generated for user {UserId}: {ProgrammeId}, {Split}, {Weeks}w, {Sessions} sessions",
            userId, programme.Id, split, durationWeeks, programme.TotalSessions);

        return programme;
    }

    // ──────────────────────────────────────────────────────────────
    //  READ
    // ──────────────────────────────────────────────────────────────

    public async Task<Programme?> GetActiveProgrammeAsync(Guid userId)
    {
        return await _context.Programmes
            .AsNoTracking()
            .Include(p => p.ProgrammeSessions)
            .FirstOrDefaultAsync(p => p.UserId == userId && p.Status == ProgrammeStatus.Active);
    }

    public async Task<Programme?> GetProgrammeAsync(Guid id, Guid userId)
    {
        return await _context.Programmes
            .AsNoTracking()
            .Include(p => p.ProgrammeSessions)
            .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId);
    }

    public async Task<ProgrammeSession?> GetTodaySessionAsync(Guid programmeId, Guid userId)
    {
        var programme = await _context.Programmes.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == programmeId && p.UserId == userId);
        if (programme == null) return null;

        var today = DateTime.UtcNow.Date;
        return await _context.ProgrammeSessions
            .AsNoTracking()
            .Where(ps => ps.ProgrammeId == programmeId
                && ps.PlannedDate.Date == today
                && (ps.Status == ProgrammeSessionStatus.Planned || ps.Status == ProgrammeSessionStatus.InProgress))
            .FirstOrDefaultAsync();
    }

    public async Task<List<ProgrammeSession>> GetWeekSessionsAsync(Guid programmeId, int weekNumber)
    {
        return await _context.ProgrammeSessions
            .AsNoTracking()
            .Where(ps => ps.ProgrammeId == programmeId && ps.WeekNumber == weekNumber)
            .OrderBy(ps => ps.OrderInWeek)
            .ToListAsync();
    }

    // ──────────────────────────────────────────────────────────────
    //  SESSION LIFECYCLE
    // ──────────────────────────────────────────────────────────────

    public async Task<Session> StartProgrammeSessionAsync(Guid programmeId, Guid programmeSessionId, Guid userId)
    {
        var programme = await _context.Programmes
            .FirstOrDefaultAsync(p => p.Id == programmeId && p.UserId == userId)
            ?? throw new KeyNotFoundException("Programme non trouve");

        var ps = await _context.ProgrammeSessions
            .FirstOrDefaultAsync(s => s.Id == programmeSessionId && s.ProgrammeId == programmeId)
            ?? throw new KeyNotFoundException("Seance du programme non trouvee");

        // If already in progress, return the existing linked session
        if (ps.Status == ProgrammeSessionStatus.InProgress && ps.SessionId.HasValue)
        {
            var existingSession = await _context.Sessions
                .Include(s => s.SessionExercises)
                    .ThenInclude(se => se.Exercise)
                .FirstOrDefaultAsync(s => s.Id == ps.SessionId.Value);
            if (existingSession != null) return existingSession;
        }

        if (ps.Status != ProgrammeSessionStatus.Planned && ps.Status != ProgrammeSessionStatus.Missed)
            throw new InvalidOperationException("Cette seance ne peut pas etre demarree");

        // Parse exercises from JSON
        var exerciseEntries = JsonSerializer.Deserialize<List<ProgrammeExerciseEntry>>(ps.ExercisesJson)
            ?? new List<ProgrammeExerciseEntry>();

        // Determine primary muscle group
        var primaryMuscle = MuscleGroup.Chest;
        if (ps.MuscleGroups.Any() && Enum.TryParse<MuscleGroup>(ps.MuscleGroups.First(), out var parsed))
            primaryMuscle = parsed;

        var secondaryMuscles = ps.MuscleGroups.Skip(1)
            .Select(m => Enum.TryParse<MuscleGroup>(m, out var mg) ? mg : (MuscleGroup?)null)
            .Where(m => m.HasValue)
            .Select(m => m!.Value)
            .ToList();

        // Create a real Session entity
        var session = new Session
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Title = ps.Title,
            Description = $"Semaine {ps.WeekNumber} - {ps.Title}",
            PrimaryMuscleGroup = primaryMuscle,
            SecondaryMuscleGroups = secondaryMuscles,
            PlannedDurationMinutes = ps.EstimatedDuration,
            Status = SessionStatus.InProgress,
            StartedAt = DateTime.UtcNow,
            GeneratedAt = DateTime.UtcNow
        };
        _context.Sessions.Add(session);

        // Create SessionExercise entries
        for (int i = 0; i < exerciseEntries.Count; i++)
        {
            var entry = exerciseEntries[i];
            var se = new SessionExercise
            {
                Id = Guid.NewGuid(),
                SessionId = session.Id,
                ExerciseId = entry.ExerciseId,
                OrderIndex = i,
                SetsPlanned = entry.Sets,
                RepsPlanned = entry.Reps,
                WeightPlannedKg = entry.WeightKg,
                RestSecondsPlanned = entry.RestSeconds,
                SetsCompleted = 0,
                IsCompleted = false,
                IsSkipped = false
            };
            _context.SessionExercises.Add(se);
        }

        // Link programme session to the real session
        ps.SessionId = session.Id;
        ps.Status = ProgrammeSessionStatus.InProgress;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Programme session started: {PsId} -> Session {SessionId}", programmeSessionId, session.Id);
        return session;
    }

    public async Task CompleteProgrammeSessionAsync(Guid programmeId, Guid programmeSessionId, Guid userId)
    {
        var programme = await _context.Programmes
            .FirstOrDefaultAsync(p => p.Id == programmeId && p.UserId == userId)
            ?? throw new KeyNotFoundException("Programme non trouve");

        var ps = await _context.ProgrammeSessions
            .FirstOrDefaultAsync(s => s.Id == programmeSessionId && s.ProgrammeId == programmeId)
            ?? throw new KeyNotFoundException("Seance du programme non trouvee");

        ps.Status = ProgrammeSessionStatus.Completed;
        ps.CompletedAt = DateTime.UtcNow;

        programme.CompletedSessions++;
        programme.ProgressPercent = programme.TotalSessions > 0
            ? Math.Round((decimal)programme.CompletedSessions / programme.TotalSessions * 100, 1)
            : 0;

        // Calculate current week
        var daysSinceStart = (DateTime.UtcNow.Date - programme.StartDate.Date).Days;
        programme.CurrentWeek = Math.Max(1, (daysSinceStart / 7) + 1);

        // Check if programme is fully completed
        var remainingPlanned = await _context.ProgrammeSessions
            .CountAsync(s => s.ProgrammeId == programmeId
                && (s.Status == ProgrammeSessionStatus.Planned || s.Status == ProgrammeSessionStatus.InProgress));

        if (remainingPlanned == 0)
        {
            programme.Status = ProgrammeStatus.Completed;
            programme.EndDate = DateTime.UtcNow;
            programme.ProgressPercent = 100;
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Programme session completed: {PsId}, progress {Progress}%",
            programmeSessionId, programme.ProgressPercent);
    }

    public async Task UpdateMissedSessionsAsync(Guid programmeId)
    {
        var today = DateTime.UtcNow.Date;
        var missedSessions = await _context.ProgrammeSessions
            .Where(ps => ps.ProgrammeId == programmeId
                && ps.PlannedDate.Date < today
                && ps.Status == ProgrammeSessionStatus.Planned)
            .ToListAsync();

        foreach (var ps in missedSessions)
        {
            ps.Status = ProgrammeSessionStatus.Missed;
        }

        if (missedSessions.Any())
        {
            await _context.SaveChangesAsync();
            _logger.LogInformation("Marked {Count} sessions as missed for programme {ProgrammeId}",
                missedSessions.Count, programmeId);
        }
    }

    // ──────────────────────────────────────────────────────────────
    //  STATUS CHANGES
    // ──────────────────────────────────────────────────────────────

    public async Task PauseProgrammeAsync(Guid programmeId, Guid userId)
    {
        var programme = await _context.Programmes
            .FirstOrDefaultAsync(p => p.Id == programmeId && p.UserId == userId)
            ?? throw new KeyNotFoundException("Programme non trouve");

        if (programme.Status != ProgrammeStatus.Active)
            throw new InvalidOperationException("Seul un programme actif peut etre mis en pause");

        programme.Status = ProgrammeStatus.Paused;
        await _context.SaveChangesAsync();
    }

    public async Task ResumeProgrammeAsync(Guid programmeId, Guid userId)
    {
        var programme = await _context.Programmes
            .FirstOrDefaultAsync(p => p.Id == programmeId && p.UserId == userId)
            ?? throw new KeyNotFoundException("Programme non trouve");

        if (programme.Status != ProgrammeStatus.Paused)
            throw new InvalidOperationException("Seul un programme en pause peut etre repris");

        programme.Status = ProgrammeStatus.Active;

        // Recalculate planned dates for remaining sessions from today
        var remainingSessions = await _context.ProgrammeSessions
            .Where(ps => ps.ProgrammeId == programmeId
                && (ps.Status == ProgrammeSessionStatus.Planned || ps.Status == ProgrammeSessionStatus.Missed))
            .OrderBy(ps => ps.WeekNumber)
            .ThenBy(ps => ps.OrderInWeek)
            .ToListAsync();

        if (remainingSessions.Any())
        {
            var today = DateTime.UtcNow.Date;
            // Gather all distinct day-of-week slots from the programme schedule
            var weekDays = remainingSessions
                .Select(s => s.DayOfWeek)
                .Distinct()
                .OrderBy(d => d)
                .ToList();

            int sessionIndex = 0;
            int weekOffset = 0;

            while (sessionIndex < remainingSessions.Count)
            {
                var weekStart = today.AddDays(weekOffset * 7);
                foreach (var day in weekDays)
                {
                    if (sessionIndex >= remainingSessions.Count) break;

                    var targetDate = weekStart.AddDays(DaysUntilNext(weekStart, day));
                    if (targetDate < today) targetDate = targetDate.AddDays(7);

                    var ps = remainingSessions[sessionIndex];
                    ps.PlannedDate = targetDate;
                    ps.Status = ProgrammeSessionStatus.Planned;
                    sessionIndex++;
                }
                weekOffset++;
            }

            // Recalculate week numbers
            var newStart = remainingSessions.First().PlannedDate.Date;
            foreach (var ps in remainingSessions)
            {
                ps.WeekNumber = ((ps.PlannedDate.Date - newStart).Days / 7) + programme.CurrentWeek;
            }
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Programme resumed: {ProgrammeId}, {Count} sessions rescheduled",
            programmeId, remainingSessions.Count);
    }

    public async Task AbandonProgrammeAsync(Guid programmeId, Guid userId)
    {
        var programme = await _context.Programmes
            .FirstOrDefaultAsync(p => p.Id == programmeId && p.UserId == userId)
            ?? throw new KeyNotFoundException("Programme non trouve");

        programme.Status = ProgrammeStatus.Abandoned;
        programme.EndDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();
    }

    // ──────────────────────────────────────────────────────────────
    //  PROGRESS & NUTRITION
    // ──────────────────────────────────────────────────────────────

    public async Task<object> GetProgressAsync(Guid programmeId, Guid userId)
    {
        var programme = await _context.Programmes
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == programmeId && p.UserId == userId)
            ?? throw new KeyNotFoundException("Programme non trouve");

        var sessions = await _context.ProgrammeSessions
            .AsNoTracking()
            .Where(ps => ps.ProgrammeId == programmeId)
            .ToListAsync();

        var completed = sessions.Count(s => s.Status == ProgrammeSessionStatus.Completed);
        var missed = sessions.Count(s => s.Status == ProgrammeSessionStatus.Missed);
        var planned = sessions.Count(s => s.Status == ProgrammeSessionStatus.Planned);
        var total = sessions.Count;
        var attempted = completed + missed;
        var adherencePercent = attempted > 0
            ? Math.Round((decimal)completed / attempted * 100, 1)
            : 100m;

        var daysSinceStart = (DateTime.UtcNow.Date - programme.StartDate.Date).Days;
        var currentWeek = Math.Max(1, (daysSinceStart / 7) + 1);

        return new
        {
            programmeId = programme.Id,
            title = programme.Title,
            split = programme.Split,
            type = programme.Type.ToString(),
            status = programme.Status.ToString(),
            durationWeeks = programme.DurationWeeks,
            currentWeek,
            completedSessions = completed,
            missedSessions = missed,
            plannedSessions = planned,
            totalSessions = total,
            progressPercent = programme.ProgressPercent,
            adherencePercent,
            startDate = programme.StartDate,
            endDate = programme.EndDate
        };
    }

    public async Task<object> GetNutritionPlanAsync(Guid programmeId)
    {
        var programme = await _context.Programmes
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == programmeId)
            ?? throw new KeyNotFoundException("Programme non trouve");

        return new
        {
            dailyCalories = programme.DailyCalories,
            dailyProtein = programme.DailyProtein,
            dailyCarbs = programme.DailyCarbs,
            dailyFat = programme.DailyFat,
            mealPlan = programme.MealPlanJson != null
                ? JsonSerializer.Deserialize<object>(programme.MealPlanJson)
                : null
        };
    }

    // ══════════════════════════════════════════════════════════════
    //  PRIVATE HELPERS
    // ══════════════════════════════════════════════════════════════

    private static string DetermineSplit(int frequency) => frequency switch
    {
        <= 3 => "Full Body",
        4 => "Upper/Lower",
        5 => "Push/Pull/Legs",
        _ => "PPL x2"
    };

    private static int DetermineDuration(UserGoal goal) => goal switch
    {
        UserGoal.LoseFat => 8,
        UserGoal.Endurance => 8,
        UserGoal.Maintenance => 8,
        _ => 12 // BuildMuscle, BuildStrength, Recomposition
    };

    private static ProgrammeType MapGoalToType(UserGoal goal) => goal switch
    {
        UserGoal.BuildMuscle => ProgrammeType.Mass,
        UserGoal.LoseFat => ProgrammeType.Cut,
        UserGoal.BuildStrength => ProgrammeType.Strength,
        UserGoal.Endurance => ProgrammeType.Endurance,
        UserGoal.Recomposition => ProgrammeType.Recomp,
        UserGoal.Maintenance => ProgrammeType.Health,
        _ => ProgrammeType.Mass
    };

    /// <summary>
    /// Convert user preferred day names (e.g. "Monday","Lundi") to int (0=Mon..6=Sun).
    /// Falls back to a balanced default schedule.
    /// </summary>
    private static List<int> ResolveTrainingDays(List<string> preferredDays, int count)
    {
        var dayMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
        {
            ["monday"] = 0, ["lundi"] = 0,
            ["tuesday"] = 1, ["mardi"] = 1,
            ["wednesday"] = 2, ["mercredi"] = 2,
            ["thursday"] = 3, ["jeudi"] = 3,
            ["friday"] = 4, ["vendredi"] = 4,
            ["saturday"] = 5, ["samedi"] = 5,
            ["sunday"] = 6, ["dimanche"] = 6
        };

        var resolved = preferredDays
            .Select(d => dayMap.TryGetValue(d.Trim(), out var v) ? v : -1)
            .Where(d => d >= 0)
            .Distinct()
            .OrderBy(d => d)
            .Take(count)
            .ToList();

        if (resolved.Count >= count) return resolved;

        // Default balanced schedules
        return count switch
        {
            2 => new List<int> { 0, 3 },           // Mon, Thu
            3 => new List<int> { 0, 2, 4 },        // Mon, Wed, Fri
            4 => new List<int> { 0, 1, 3, 4 },     // Mon, Tue, Thu, Fri
            5 => new List<int> { 0, 1, 2, 3, 4 },  // Mon-Fri
            6 => new List<int> { 0, 1, 2, 3, 4, 5 }, // Mon-Sat
            _ => new List<int> { 0, 2, 4 }
        };
    }

    /// <summary>
    /// Get the target muscle groups for a specific day position in the split.
    /// </summary>
    private static List<MuscleGroup> GetMusclesForDay(string split, int dayIndex, int daysPerWeek)
    {
        return split switch
        {
            "Full Body" => new List<MuscleGroup>
            {
                MuscleGroup.Chest, MuscleGroup.Back, MuscleGroup.Quadriceps,
                MuscleGroup.Shoulders, MuscleGroup.Biceps, MuscleGroup.Abs
            },

            "Upper/Lower" => (dayIndex % 2 == 0)
                ? new List<MuscleGroup> { MuscleGroup.Chest, MuscleGroup.Back, MuscleGroup.Shoulders, MuscleGroup.Biceps, MuscleGroup.Triceps }
                : new List<MuscleGroup> { MuscleGroup.Quadriceps, MuscleGroup.Hamstrings, MuscleGroup.Glutes, MuscleGroup.Calves, MuscleGroup.Abs },

            "Push/Pull/Legs" => (dayIndex % 3) switch
            {
                0 => new List<MuscleGroup> { MuscleGroup.Chest, MuscleGroup.Shoulders, MuscleGroup.Triceps },
                1 => new List<MuscleGroup> { MuscleGroup.Back, MuscleGroup.Biceps, MuscleGroup.Abs },
                _ => new List<MuscleGroup> { MuscleGroup.Quadriceps, MuscleGroup.Hamstrings, MuscleGroup.Glutes, MuscleGroup.Calves }
            },

            "PPL x2" => (dayIndex % 3) switch
            {
                0 => new List<MuscleGroup> { MuscleGroup.Chest, MuscleGroup.Shoulders, MuscleGroup.Triceps },
                1 => new List<MuscleGroup> { MuscleGroup.Back, MuscleGroup.Biceps, MuscleGroup.Abs },
                _ => new List<MuscleGroup> { MuscleGroup.Quadriceps, MuscleGroup.Hamstrings, MuscleGroup.Glutes, MuscleGroup.Calves }
            },

            _ => new List<MuscleGroup> { MuscleGroup.Chest, MuscleGroup.Back, MuscleGroup.Quadriceps }
        };
    }

    private static DateTime CalculatePlannedDate(DateTime startDate, int week, int dayOfWeek)
    {
        // startDate is the programme start (a calendar date).
        // week 1 starts on startDate's week, dayOfWeek 0=Mon..6=Sun.
        var startMonday = startDate.AddDays(-(((int)startDate.DayOfWeek + 6) % 7)); // Monday of start week
        return startMonday.AddDays((week - 1) * 7 + dayOfWeek);
    }

    /// <summary>
    /// Smart exercise selection from the DB exercise pool.
    /// Filters by muscle group, equipment compatibility, injury exclusion.
    /// Adds progressive variety across weeks via seeded randomisation.
    /// </summary>
    private static List<Exercise> SelectExercises(
        List<Exercise> allExercises,
        List<MuscleGroup> targetMuscles,
        Equipment userEquipment,
        List<string> injuries,
        UserGoal goal,
        DifficultyLevel level,
        int week)
    {
        // Injury muscle exclusion mapping
        var injuryMuscleMap = new Dictionary<string, MuscleGroup[]>(StringComparer.OrdinalIgnoreCase)
        {
            ["epaule"] = new[] { MuscleGroup.Shoulders },
            ["shoulder"] = new[] { MuscleGroup.Shoulders },
            ["genou"] = new[] { MuscleGroup.Quadriceps, MuscleGroup.Hamstrings, MuscleGroup.Calves },
            ["knee"] = new[] { MuscleGroup.Quadriceps, MuscleGroup.Hamstrings, MuscleGroup.Calves },
            ["dos"] = new[] { MuscleGroup.Back },
            ["back"] = new[] { MuscleGroup.Back },
            ["poignet"] = new[] { MuscleGroup.Biceps, MuscleGroup.Triceps },
            ["wrist"] = new[] { MuscleGroup.Biceps, MuscleGroup.Triceps },
            ["hanche"] = new[] { MuscleGroup.Glutes, MuscleGroup.Quadriceps },
            ["hip"] = new[] { MuscleGroup.Glutes, MuscleGroup.Quadriceps },
            ["coude"] = new[] { MuscleGroup.Biceps, MuscleGroup.Triceps },
            ["elbow"] = new[] { MuscleGroup.Biceps, MuscleGroup.Triceps },
            ["cheville"] = new[] { MuscleGroup.Calves },
            ["ankle"] = new[] { MuscleGroup.Calves }
        };

        var excludedMuscles = new HashSet<MuscleGroup>();
        foreach (var injury in injuries)
        {
            foreach (var (key, muscles) in injuryMuscleMap)
            {
                if (injury.Contains(key, StringComparison.OrdinalIgnoreCase))
                {
                    foreach (var m in muscles) excludedMuscles.Add(m);
                }
            }
        }

        // Always allow Bodyweight equipment
        var equipmentFilter = userEquipment | Equipment.Bodyweight;

        // Filter exercises
        var candidates = allExercises
            .Where(e =>
                // Must target one of the required muscles
                targetMuscles.Contains(e.PrimaryMuscle) &&
                // Equipment must be compatible (bitwise: exercise requires subset of what user has)
                (e.RequiredEquipment == Equipment.None || (e.RequiredEquipment & equipmentFilter) == e.RequiredEquipment) &&
                // Not targeting injured areas
                !excludedMuscles.Contains(e.PrimaryMuscle) &&
                // Difficulty appropriate (allow one level above for progression)
                (int)e.Difficulty <= (int)level + 1)
            .ToList();

        // Determine how many exercises per muscle group
        int totalExercises = goal switch
        {
            UserGoal.BuildStrength => 5,
            UserGoal.BuildMuscle => 6,
            UserGoal.LoseFat => 7,
            UserGoal.Endurance => 7,
            _ => 6
        };

        // For full-body splits, pick 1-2 per muscle group; for focused splits, pick more per muscle
        var selected = new List<Exercise>();
        var rng = new Random(week * 31 + targetMuscles.Count * 7); // Seeded for variety per week

        if (targetMuscles.Count >= 5) // Full body or upper body
        {
            // 1-2 exercises per muscle group
            foreach (var muscle in targetMuscles)
            {
                var muscleExercises = candidates
                    .Where(e => e.PrimaryMuscle == muscle)
                    .OrderBy(_ => rng.Next())
                    .Take(1)
                    .ToList();
                selected.AddRange(muscleExercises);
                if (selected.Count >= totalExercises) break;
            }
        }
        else // Focused split (push/pull/legs)
        {
            // 2-3 exercises per muscle group
            var perMuscle = Math.Max(2, totalExercises / targetMuscles.Count);
            foreach (var muscle in targetMuscles)
            {
                var muscleExercises = candidates
                    .Where(e => e.PrimaryMuscle == muscle)
                    .OrderBy(_ => rng.Next())
                    .Take(perMuscle)
                    .ToList();
                selected.AddRange(muscleExercises);
            }
        }

        // Trim to target count
        if (selected.Count > totalExercises)
            selected = selected.Take(totalExercises).ToList();

        // If we still don't have enough, add from secondary muscles or any available
        if (selected.Count < 4)
        {
            var extras = allExercises
                .Where(e => !selected.Contains(e)
                    && (e.RequiredEquipment == Equipment.None || (e.RequiredEquipment & equipmentFilter) == e.RequiredEquipment)
                    && !excludedMuscles.Contains(e.PrimaryMuscle))
                .OrderBy(_ => rng.Next())
                .Take(4 - selected.Count)
                .ToList();
            selected.AddRange(extras);
        }

        return selected;
    }

    /// <summary>
    /// Returns (sets, reps, restSeconds) based on goal, level, and progressive overload across weeks.
    /// </summary>
    private static (int sets, int reps, int restSeconds) GetSetsRepsRest(
        UserGoal goal, DifficultyLevel level, Exercise exercise, int week, int totalWeeks)
    {
        // Base values by goal
        var (baseSets, baseReps, baseRest) = goal switch
        {
            UserGoal.BuildStrength => (5, 5, 180),
            UserGoal.BuildMuscle => (4, 10, 90),
            UserGoal.LoseFat => (3, 15, 60),
            UserGoal.Endurance => (3, 20, 45),
            UserGoal.Recomposition => (4, 12, 75),
            UserGoal.Maintenance => (3, 12, 90),
            _ => (3, 12, 90)
        };

        // Level adjustment
        var levelBonus = level switch
        {
            DifficultyLevel.Beginner => -1,
            DifficultyLevel.Intermediate => 0,
            DifficultyLevel.Advanced => 1,
            DifficultyLevel.Expert => 1,
            _ => 0
        };

        var sets = Math.Max(2, baseSets + levelBonus);

        // Progressive overload: add a set every 4 weeks, reduce reps slightly
        var phase = (week - 1) / 4; // 0, 1, 2 for a 12-week programme
        sets = Math.Min(sets + phase, 6);

        var reps = baseReps;
        // In later phases, slight rep adjustments for periodisation
        if (phase >= 2 && goal == UserGoal.BuildStrength)
            reps = Math.Max(3, reps - 1);
        else if (phase >= 2 && goal == UserGoal.BuildMuscle)
            reps = Math.Max(8, reps - 2);

        // Use exercise-specific rep ranges when available
        if (goal == UserGoal.BuildStrength && exercise.MaxRepsStrength > 0)
            reps = Math.Min(reps, exercise.MaxRepsStrength);
        else if (goal == UserGoal.BuildMuscle && exercise.MaxRepsHypertrophy > 0)
            reps = Math.Clamp(reps, exercise.MinRepsHypertrophy, exercise.MaxRepsHypertrophy);
        else if ((goal == UserGoal.Endurance || goal == UserGoal.LoseFat) && exercise.MaxRepsEndurance > 0)
            reps = Math.Clamp(reps, exercise.MinRepsEndurance, exercise.MaxRepsEndurance);

        // Deload week: every 4th week, reduce volume
        if (week % 4 == 0)
        {
            sets = Math.Max(2, sets - 1);
            reps = Math.Max(3, reps - 2);
            baseRest += 30; // More rest during deload
        }

        return (sets, reps, baseRest);
    }

    /// <summary>
    /// Generate a 7-day rotating meal plan from the Recipes table.
    /// </summary>
    private async Task<string> GenerateMealPlanJsonAsync(User user)
    {
        // Query recipes filtered by diet & allergies
        var recipesQuery = _context.Recipes.Where(r => r.IsActive);

        // Diet filtering
        if (user.DietType.Equals("vegetarian", StringComparison.OrdinalIgnoreCase))
            recipesQuery = recipesQuery.Where(r => r.IsVegetarian);
        else if (user.DietType.Equals("vegan", StringComparison.OrdinalIgnoreCase))
            recipesQuery = recipesQuery.Where(r => r.IsVegan);

        // Bulking/cutting flag
        var isCutting = user.Goal == UserGoal.LoseFat;
        var isBulking = user.Goal == UserGoal.BuildMuscle || user.Goal == UserGoal.BuildStrength;
        if (isCutting) recipesQuery = recipesQuery.Where(r => r.IsCutting || !r.IsBulking);
        if (isBulking) recipesQuery = recipesQuery.Where(r => r.IsBulking || !r.IsCutting);

        // Ramadan
        if (user.IsRamadanMode)
            recipesQuery = recipesQuery.Where(r => r.IsRamadanFriendly);

        var recipes = await recipesQuery.ToListAsync();

        // Filter out recipes containing allergens (check tags/title against food allergies)
        if (user.FoodAllergies.Any())
        {
            recipes = recipes.Where(r =>
                !user.FoodAllergies.Any(allergy =>
                    r.TitleFr.Contains(allergy, StringComparison.OrdinalIgnoreCase) ||
                    r.Tags.Any(t => t.Contains(allergy, StringComparison.OrdinalIgnoreCase)) ||
                    r.DietTags.Any(t => t.Contains(allergy, StringComparison.OrdinalIgnoreCase)) ||
                    r.IngredientsJson.Contains(allergy, StringComparison.OrdinalIgnoreCase)
                )).ToList();
        }

        // Group by meal category
        var breakfasts = recipes.Where(r => r.Category == RecipeCategory.Breakfast).ToList();
        var lunches = recipes.Where(r => r.Category == RecipeCategory.Lunch).ToList();
        var dinners = recipes.Where(r => r.Category == RecipeCategory.Dinner).ToList();
        var snacks = recipes.Where(r => r.Category == RecipeCategory.Snack
            || r.Category == RecipeCategory.PreWorkout
            || r.Category == RecipeCategory.PostWorkout
            || r.Category == RecipeCategory.Smoothie).ToList();

        var rng = new Random();
        var mealPlan = new List<object>();

        for (int day = 0; day < 7; day++)
        {
            var dayMeals = new
            {
                day = day + 1,
                dayName = day switch
                {
                    0 => "Lundi", 1 => "Mardi", 2 => "Mercredi",
                    3 => "Jeudi", 4 => "Vendredi", 5 => "Samedi", _ => "Dimanche"
                },
                breakfast = PickRecipe(breakfasts, rng),
                lunch = PickRecipe(lunches, rng),
                dinner = PickRecipe(dinners, rng),
                snack = user.MealsPerDay > 3 ? PickRecipe(snacks, rng) : null
            };
            mealPlan.Add(dayMeals);
        }

        return JsonSerializer.Serialize(mealPlan);
    }

    private static object? PickRecipe(List<Recipe> pool, Random rng)
    {
        if (!pool.Any()) return null;
        var r = pool[rng.Next(pool.Count)];
        return new
        {
            recipeId = r.Id,
            title = r.TitleFr,
            calories = r.CaloriesPerServing,
            protein = r.ProteinsGPerServing,
            carbs = r.CarbsGPerServing,
            fat = r.FatsGPerServing,
            photoUrl = r.PhotoUrl
        };
    }

    private static string BuildProgrammeTitle(ProgrammeType type, string split, DifficultyLevel level)
    {
        var typeLabel = type switch
        {
            ProgrammeType.Mass => "Prise de Masse",
            ProgrammeType.Cut => "Seche",
            ProgrammeType.Strength => "Force",
            ProgrammeType.Endurance => "Endurance",
            ProgrammeType.Recomp => "Recomposition",
            ProgrammeType.Health => "Sante & Forme",
            _ => "Programme"
        };
        return $"Programme {typeLabel} - {split}";
    }

    private static string BuildProgrammeDescription(ProgrammeType type, string split, int weeks, User user)
    {
        return $"Programme de {weeks} semaines en {split}. " +
               $"Niveau {user.Level}, {user.TrainingFrequency}x/semaine, {user.PreferredDuration}min par seance. " +
               $"Objectif calorique: {(int)(user.DailyCalorieTarget ?? 2200)} kcal/jour.";
    }

    private static string BuildDayTitle(string split, int dayIndex, List<MuscleGroup> muscles, int dayOfWeek)
    {
        var dayName = dayOfWeek switch
        {
            0 => "Lundi", 1 => "Mardi", 2 => "Mercredi", 3 => "Jeudi",
            4 => "Vendredi", 5 => "Samedi", _ => "Dimanche"
        };

        var muscleLabels = new Dictionary<MuscleGroup, string>
        {
            [MuscleGroup.Chest] = "Pectoraux",
            [MuscleGroup.Back] = "Dos",
            [MuscleGroup.Quadriceps] = "Quadriceps",
            [MuscleGroup.Hamstrings] = "Ischio-jambiers",
            [MuscleGroup.Glutes] = "Fessiers",
            [MuscleGroup.Calves] = "Mollets",
            [MuscleGroup.Shoulders] = "Epaules",
            [MuscleGroup.Biceps] = "Biceps",
            [MuscleGroup.Triceps] = "Triceps",
            [MuscleGroup.Abs] = "Abdominaux"
        };

        if (split == "Full Body")
            return $"{dayName} - Full Body";

        var labels = muscles
            .Where(m => muscleLabels.ContainsKey(m))
            .Select(m => muscleLabels[m])
            .Take(3);

        return $"{dayName} - {string.Join(" / ", labels)}";
    }

    private static int DaysUntilNext(DateTime from, int targetDayOfWeek)
    {
        // targetDayOfWeek: 0=Mon..6=Sun
        var fromDow = ((int)from.DayOfWeek + 6) % 7; // convert .NET Sun=0 to Mon=0
        var diff = targetDayOfWeek - fromDow;
        return diff < 0 ? diff + 7 : diff;
    }

    /// <summary>
    /// Helper class for deserialising ExercisesJson entries.
    /// </summary>
    private class ProgrammeExerciseEntry
    {
        public Guid ExerciseId { get; set; }
        public string Name { get; set; } = "";
        public int Sets { get; set; }
        public int Reps { get; set; }
        public decimal? WeightKg { get; set; }
        public int RestSeconds { get; set; } = 90;
    }
}
