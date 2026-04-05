using System.Text.Json;
using BigBoss.Core.DTOs.Sessions;
using BigBoss.Core.Entities;
using BigBoss.Core.Enums;
using BigBoss.Core.Interfaces;
using BigBoss.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BigBoss.Infrastructure.Services;

public class SessionService : ISessionService
{
    private readonly BigBossDbContext _context;
    private readonly IClaudeService _claudeService;
    private readonly OpenAIService _openAIService;
    private readonly IUserService _userService;
    private readonly IPointsService _pointsService;
    private readonly IStreakService _streakService;
    private readonly IGamificationConfigService _gamificationConfig;
    private readonly IChallengeParticipationService _challengeParticipationService;
    private readonly IAchievementService _achievementService;
    private readonly IAffiliationService _affiliationService;
    private readonly IFeedService _feedService;
    private readonly ILogger<SessionService> _logger;

    public SessionService(
        BigBossDbContext context,
        IClaudeService claudeService,
        OpenAIService openAIService,
        IUserService userService,
        IPointsService pointsService,
        IStreakService streakService,
        IGamificationConfigService gamificationConfig,
        IChallengeParticipationService challengeParticipationService,
        IAchievementService achievementService,
        IAffiliationService affiliationService,
        IFeedService feedService,
        ILogger<SessionService> logger)
    {
        _context = context;
        _claudeService = claudeService;
        _openAIService = openAIService;
        _userService = userService;
        _pointsService = pointsService;
        _streakService = streakService;
        _gamificationConfig = gamificationConfig;
        _challengeParticipationService = challengeParticipationService;
        _achievementService = achievementService;
        _affiliationService = affiliationService;
        _feedService = feedService;
        _logger = logger;
    }

    public async Task<SessionDto> GenerateSessionAsync(Guid userId, GenerateSessionRequest request)
    {
        var user = await _userService.GetByIdAsync(userId);
        if (user == null) throw new KeyNotFoundException("Utilisateur non trouve");

        var muscleGroup = request.PreferredMuscleGroup ?? MuscleGroup.Chest;
        var isPremium = user.SubscriptionTier != SubscriptionTier.Free;

        // Premium/Elite users: AI-powered generation with OpenAI
        if (isPremium && _openAIService.IsConfigured)
        {
            try
            {
                var session = await GenerateSessionWithOpenAI(userId, user, muscleGroup, request);
                _logger.LogInformation("OpenAI session generated for premium user {UserId}: {SessionId}", userId, session.Id);
                return await GetSessionAsync(session.Id, userId) ?? throw new Exception("Failed to retrieve generated session");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "OpenAI generation FAILED for premium user {UserId}: {Message}", userId, ex.Message);
            }
        }

        // Free users (or AI fallback): smart DB-based generation
        var session2 = await GenerateSessionFromDatabase(userId, muscleGroup, request.DurationMinutes, user);
        _logger.LogInformation("{Tier} session generated for user {UserId}: {SessionId}",
            isPremium ? "Fallback" : "Free", userId, session2.Id);
        return await GetSessionAsync(session2.Id, userId) ?? throw new Exception("Failed to retrieve generated session");
    }

    private async Task<Session> GenerateSessionWithOpenAI(Guid userId, User user, MuscleGroup muscleGroup, GenerateSessionRequest request)
    {
        // Get recent muscle groups
        var recentMuscles = await _context.Sessions
            .Where(s => s.UserId == userId && s.Status == SessionStatus.Completed && s.CompletedAt > DateTime.UtcNow.AddDays(-7))
            .Select(s => s.PrimaryMuscleGroup.ToString())
            .Distinct()
            .ToListAsync();

        // Get available exercises for this muscle group
        var dbExercises = await _context.Exercises
            .Where(e => e.IsActive && (e.PrimaryMuscle == muscleGroup || e.Category == muscleGroup))
            .OrderBy(e => e.NameFr)
            .Select(e => e.NameFr)
            .Take(30)
            .ToListAsync();

        if (!dbExercises.Any())
        {
            dbExercises = await _context.Exercises.Where(e => e.IsActive).OrderBy(e => Guid.NewGuid()).Take(20).Select(e => e.NameFr).ToListAsync();
        }

        var muscleLabels = new Dictionary<MuscleGroup, string>
        {
            { MuscleGroup.Chest, "Pectoraux" }, { MuscleGroup.Back, "Dos" },
            { MuscleGroup.Quadriceps, "Jambes" }, { MuscleGroup.Hamstrings, "Ischio-jambiers" },
            { MuscleGroup.Glutes, "Fessiers" }, { MuscleGroup.Calves, "Mollets" },
            { MuscleGroup.Shoulders, "Epaules" }, { MuscleGroup.Biceps, "Biceps" },
            { MuscleGroup.Triceps, "Triceps" }, { MuscleGroup.Abs, "Abdominaux" },
            { MuscleGroup.Bodyweight, "Full Body" }, { MuscleGroup.Cardio, "Cardio" },
            { MuscleGroup.Mobility, "Mobilite" }
        };

        // Call OpenAI
        var aiJson = await _openAIService.GenerateSessionAsync(
            user.Goal.ToString(), user.Level.ToString(), user.WeightKg,
            muscleLabels.ContainsKey(muscleGroup) ? muscleLabels[muscleGroup] : muscleGroup.ToString(),
            request.DurationMinutes, request.EnergyLevel,
            recentMuscles, dbExercises);

        // Parse AI response
        var aiData = JsonDocument.Parse(aiJson).RootElement;

        var session = new Session
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Title = aiData.TryGetProperty("title", out var title) ? title.GetString() ?? "Seance IA" : "Seance IA",
            Description = aiData.TryGetProperty("description", out var desc) ? desc.GetString() : null,
            PrimaryMuscleGroup = muscleGroup,
            PlannedDurationMinutes = request.DurationMinutes,
            Status = SessionStatus.Generated,
            AiResponseJson = aiJson,
            AiSummary = aiData.TryGetProperty("ai_summary", out var summary) ? summary.GetString() : null,
            GeneratedAt = DateTime.UtcNow
        };

        // Parse recommendations
        if (aiData.TryGetProperty("recommendations", out var recs))
        {
            session.Recommendations = recs.EnumerateArray().Select(r => r.GetString() ?? "").Where(r => r != "").ToList();
        }

        _context.Sessions.Add(session);

        // Map AI exercises to DB exercises
        if (aiData.TryGetProperty("exercises", out var exercises))
        {
            int orderIndex = 0;
            foreach (var ex in exercises.EnumerateArray())
            {
                var exerciseName = ex.TryGetProperty("name", out var n) ? n.GetString() ?? "" : "";
                var dbExercise = await _context.Exercises
                    .FirstOrDefaultAsync(e => e.NameFr.ToLower() == exerciseName.ToLower());

                if (dbExercise == null)
                {
                    var firstWord = exerciseName.ToLower().Split(' ')[0];
                    dbExercise = await _context.Exercises
                        .FirstOrDefaultAsync(e => e.NameFr.ToLower().Contains(firstWord));
                }

                if (dbExercise == null) continue;

                var sets = ex.TryGetProperty("sets", out var s) ? s.GetInt32() : 4;
                var reps = ex.TryGetProperty("reps", out var r) ? r.GetInt32() : 10;
                var weight = ex.TryGetProperty("weight_kg", out var w) && w.ValueKind == JsonValueKind.Number ? (decimal?)w.GetDecimal() : null;
                var rest = ex.TryGetProperty("rest_seconds", out var rs) ? rs.GetInt32() : 90;

                _context.SessionExercises.Add(new SessionExercise
                {
                    Id = Guid.NewGuid(),
                    SessionId = session.Id,
                    ExerciseId = dbExercise.Id,
                    OrderIndex = orderIndex++,
                    SetsPlanned = sets,
                    RepsPlanned = reps,
                    WeightPlannedKg = weight,
                    RestSecondsPlanned = rest,
                    AiNotes = ex.TryGetProperty("notes", out var notes) ? notes.GetString() : null,
                    SetsCompleted = 0,
                    IsCompleted = false,
                    IsSkipped = false
                });
            }
        }

        await _context.SaveChangesAsync();
        return session;
    }

    private async Task<Session> GenerateSessionFromDatabase(Guid userId, MuscleGroup muscleGroup, int durationMinutes, User user)
    {
        // Determine number of exercises based on duration
        var exerciseCount = durationMinutes switch
        {
            <= 30 => 4,
            <= 45 => 5,
            <= 60 => 6,
            <= 75 => 7,
            _ => 8
        };

        // Determine sets/reps based on user goal
        var (setsPerExercise, repsPerExercise) = user.Goal switch
        {
            UserGoal.BuildStrength => (5, 5),
            UserGoal.BuildMuscle => (4, 10),
            UserGoal.LoseFat => (3, 15),
            UserGoal.Endurance => (3, 20),
            _ => (3, 12)
        };

        // Get exercises for the target muscle group
        var exercises = await _context.Exercises
            .Where(e => e.IsActive && (e.PrimaryMuscle == muscleGroup || e.Category == muscleGroup))
            .OrderBy(e => Guid.NewGuid()) // Random order
            .Take(exerciseCount)
            .ToListAsync();

        // If not enough exercises for this muscle, add some compound/full body
        if (exercises.Count < exerciseCount)
        {
            var extra = await _context.Exercises
                .Where(e => e.IsActive && !exercises.Select(x => x.Id).Contains(e.Id))
                .OrderBy(e => Guid.NewGuid())
                .Take(exerciseCount - exercises.Count)
                .ToListAsync();
            exercises.AddRange(extra);
        }

        var muscleLabels = new Dictionary<MuscleGroup, string>
        {
            { MuscleGroup.Chest, "Pectoraux" }, { MuscleGroup.Back, "Dos" },
            { MuscleGroup.Quadriceps, "Jambes" }, { MuscleGroup.Hamstrings, "Ischio-jambiers" },
            { MuscleGroup.Glutes, "Fessiers" }, { MuscleGroup.Calves, "Mollets" },
            { MuscleGroup.Shoulders, "Epaules" }, { MuscleGroup.Biceps, "Biceps" },
            { MuscleGroup.Triceps, "Triceps" }, { MuscleGroup.Abs, "Abdominaux" },
            { MuscleGroup.Bodyweight, "Full Body" }, { MuscleGroup.Cardio, "Cardio" },
            { MuscleGroup.Mobility, "Mobilite" }
        };

        var muscleLabel = muscleLabels.ContainsKey(muscleGroup) ? muscleLabels[muscleGroup] : muscleGroup.ToString();

        var session = new Session
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Title = $"Seance {muscleLabel} - {durationMinutes}min",
            Description = $"Seance generee automatiquement: {exerciseCount} exercices, {setsPerExercise}x{repsPerExercise}",
            PrimaryMuscleGroup = muscleGroup,
            PlannedDurationMinutes = durationMinutes,
            Status = SessionStatus.Generated,
            AiSummary = $"Programme {muscleLabel} adapte a votre niveau ({user.Level}). Objectif: {user.Goal}.",
            GeneratedAt = DateTime.UtcNow
        };

        _context.Sessions.Add(session);

        for (int i = 0; i < exercises.Count; i++)
        {
            var ex = exercises[i];
            var sessionExercise = new SessionExercise
            {
                Id = Guid.NewGuid(),
                SessionId = session.Id,
                ExerciseId = ex.Id,
                OrderIndex = i,
                SetsPlanned = setsPerExercise,
                RepsPlanned = repsPerExercise,
                WeightPlannedKg = null,
                RestSecondsPlanned = user.Goal == UserGoal.BuildStrength ? 180 : 90,
                SetsCompleted = 0,
                IsCompleted = false,
                IsSkipped = false
            };
            _context.SessionExercises.Add(sessionExercise);
        }

        await _context.SaveChangesAsync();
        return session;
    }

    private async Task<Session> CreateSessionFromAiResponse(Guid userId, string aiResponse, GenerateSessionRequest request)
    {
        // Parse AI JSON response (simplified - in production, add error handling)
        var aiData = JsonDocument.Parse(aiResponse).RootElement;

        var session = new Session
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Title = aiData.GetProperty("title").GetString() ?? "Seance personnalisee",
            Description = aiData.TryGetProperty("description", out var desc) ? desc.GetString() : null,
            PrimaryMuscleGroup = request.PreferredMuscleGroup ?? MuscleGroup.Chest,
            PlannedDurationMinutes = request.DurationMinutes,
            Status = SessionStatus.Generated,
            AiResponseJson = aiResponse,
            GeneratedAt = DateTime.UtcNow
        };

        _context.Sessions.Add(session);

        // Add exercises from AI response
        if (aiData.TryGetProperty("exercises", out var exercises))
        {
            int orderIndex = 0;
            foreach (var ex in exercises.EnumerateArray())
            {
                // Try to find matching exercise in database
                var exerciseName = ex.GetProperty("name").GetString() ?? "";
                var dbExercise = await _context.Exercises
                    .FirstOrDefaultAsync(e => e.NameFr.ToLower().Contains(exerciseName.ToLower()));

                if (dbExercise != null)
                {
                    var sessionExercise = new SessionExercise
                    {
                        Id = Guid.NewGuid(),
                        SessionId = session.Id,
                        ExerciseId = dbExercise.Id,
                        OrderIndex = orderIndex++,
                        SetsPlanned = ex.TryGetProperty("sets", out var sets) ? sets.GetInt32() : 3,
                        RepsPlanned = ex.TryGetProperty("reps", out var reps) ? reps.GetInt32() : 10,
                        RestSecondsPlanned = ex.TryGetProperty("rest_seconds", out var rest) ? rest.GetInt32() : 90
                    };

                    _context.SessionExercises.Add(sessionExercise);
                }
            }
        }

        await _context.SaveChangesAsync();
        return session;
    }

    public async Task<SessionDto?> GetSessionAsync(Guid sessionId, Guid userId)
    {
        var session = await _context.Sessions
            .AsNoTracking()
            .Include(s => s.SessionExercises)
                .ThenInclude(se => se.Exercise)
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId);

        if (session == null) return null;

        return MapToSessionDto(session);
    }

    public async Task<List<SessionDto>> GetUserSessionsAsync(Guid userId, int page = 1, int pageSize = 10)
    {
        var sessions = await _context.Sessions
            .AsNoTracking()
            .Include(s => s.SessionExercises)
                .ThenInclude(se => se.Exercise)
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.GeneratedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return sessions.Select(MapToSessionDto).ToList();
    }

    public async Task<SessionDto> StartSessionAsync(Guid sessionId, Guid userId)
    {
        var session = await _context.Sessions
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId);

        if (session == null) throw new KeyNotFoundException("Seance non trouvee");

        session.Status = SessionStatus.InProgress;
        session.StartedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return await GetSessionAsync(sessionId, userId) ?? throw new Exception("Failed to start session");
    }

    public async Task<SessionExerciseDto> LogSetAsync(Guid userId, LogSetRequest request)
    {
        var sessionExercise = await _context.SessionExercises
            .Include(se => se.Session)
            .Include(se => se.Exercise)
            .FirstOrDefaultAsync(se => se.Id == request.SessionExerciseId && se.Session.UserId == userId);

        if (sessionExercise == null) throw new KeyNotFoundException("Exercice non trouve");

        // Add the completed set
        sessionExercise.RepsCompleted.Add(request.Reps);
        sessionExercise.WeightsCompletedKg.Add(request.WeightKg);
        if (request.FormScore.HasValue) sessionExercise.FormScores.Add(request.FormScore.Value);
        if (request.RestSeconds.HasValue) sessionExercise.RestSecondsActual.Add(request.RestSeconds.Value);

        sessionExercise.SetsCompleted = sessionExercise.RepsCompleted.Count;

        // Check if exercise is completed
        if (sessionExercise.SetsCompleted >= sessionExercise.SetsPlanned)
        {
            sessionExercise.IsCompleted = true;
            sessionExercise.CompletedAt = DateTime.UtcNow;
            sessionExercise.AverageFormScore = sessionExercise.FormScores.Any()
                ? (decimal)sessionExercise.FormScores.Average()
                : null;
        }

        if (!string.IsNullOrEmpty(request.Notes))
        {
            sessionExercise.UserNotes = request.Notes;
        }

        await _context.SaveChangesAsync();

        return MapToSessionExerciseDto(sessionExercise);
    }

    public async Task<SessionExerciseDto> SkipExerciseAsync(Guid userId, SkipExerciseRequest request)
    {
        var sessionExercise = await _context.SessionExercises
            .Include(se => se.Session)
            .Include(se => se.Exercise)
            .FirstOrDefaultAsync(se => se.Id == request.SessionExerciseId && se.Session.UserId == userId);

        if (sessionExercise == null) throw new KeyNotFoundException("Exercice non trouve");

        sessionExercise.IsSkipped = true;
        sessionExercise.SkipReason = request.Reason;

        await _context.SaveChangesAsync();

        return MapToSessionExerciseDto(sessionExercise);
    }

    public async Task<SessionSummaryDto> CompleteSessionAsync(Guid sessionId, Guid userId)
    {
        var session = await _context.Sessions
            .Include(s => s.SessionExercises)
                .ThenInclude(se => se.Exercise)
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId);

        if (session == null) throw new KeyNotFoundException("Seance non trouvee");

        session.Status = SessionStatus.Completed;
        session.CompletedAt = DateTime.UtcNow;
        session.ActualDurationMinutes = session.StartedAt.HasValue
            ? (int)(DateTime.UtcNow - session.StartedAt.Value).TotalMinutes
            : session.PlannedDurationMinutes;

        // Calculate stats
        var completedExercises = session.SessionExercises.Where(se => se.IsCompleted).ToList();
        session.TotalVolumeKg = completedExercises.Sum(se =>
            se.WeightsCompletedKg.Zip(se.RepsCompleted, (w, r) => w * r).Sum());
        session.TotalSets = completedExercises.Sum(se => se.SetsCompleted);
        session.TotalReps = completedExercises.Sum(se => se.RepsCompleted.Sum());

        // Auto-complete linked ProgrammeSession if any
        var linkedProgrammeSession = await _context.ProgrammeSessions
            .Include(ps => ps.Programme)
            .FirstOrDefaultAsync(ps => ps.SessionId == sessionId);
        if (linkedProgrammeSession != null && linkedProgrammeSession.Status != ProgrammeSessionStatus.Completed)
        {
            linkedProgrammeSession.Status = ProgrammeSessionStatus.Completed;
            linkedProgrammeSession.CompletedAt = DateTime.UtcNow;

            var programme = linkedProgrammeSession.Programme;
            if (programme != null)
            {
                programme.CompletedSessions++;
                programme.ProgressPercent = programme.TotalSessions > 0
                    ? Math.Round((decimal)programme.CompletedSessions / programme.TotalSessions * 100, 1)
                    : 0;

                // Auto-complete programme if all sessions done
                if (programme.CompletedSessions >= programme.TotalSessions && programme.Status == ProgrammeStatus.Active)
                {
                    programme.Status = ProgrammeStatus.Completed;
                    programme.EndDate = DateTime.UtcNow;
                }
            }
        }

        await _context.SaveChangesAsync();

        // Generate AI summary
        var summary = await GenerateSummary(session, userId);

        // Award points for session completion
        try
        {
            var minDuration = await _gamificationConfig.GetIntAsync("points.session_min_duration", 15);
            var minExercises = await _gamificationConfig.GetIntAsync("points.session_min_exercises", 3);
            var sessionPoints = await _gamificationConfig.GetIntAsync("points.session_complete", 10);

            var duration = session.ActualDurationMinutes ?? 0;
            var exerciseCount = session.SessionExercises.Count(se => se.IsCompleted);

            if (duration >= minDuration && exerciseCount >= minExercises && sessionPoints > 0)
            {
                await _pointsService.AwardPointsAsync(new PointAwardRequest
                {
                    UserId = userId,
                    Amount = sessionPoints,
                    Type = PointTransactionType.SessionComplete,
                    Reason = $"Seance terminee: {session.Title}",
                    IdempotencyKey = $"session_complete:{session.Id}",
                    RelatedEntityId = session.Id,
                    RelatedEntityType = "Session"
                });

                // Update streak
                await _streakService.RecordActivityAsync(userId);

                // Check for PR bonus
                if (summary.NewPersonalRecords?.Count > 0)
                {
                    var prBonus = await _gamificationConfig.GetIntAsync("points.pr_bonus", 30);
                    if (prBonus > 0)
                    {
                        await _pointsService.AwardPointsAsync(new PointAwardRequest
                        {
                            UserId = userId,
                            Amount = prBonus,
                            Type = PointTransactionType.PRBonus,
                            Reason = $"Record personnel battu! ({summary.NewPersonalRecords.Count} PR)",
                            IdempotencyKey = $"pr_bonus:{session.Id}",
                            RelatedEntityId = session.Id,
                            RelatedEntityType = "Session"
                        });
                    }
                }
            }

            // Update challenge progress
            await _challengeParticipationService.UpdateProgressFromSessionAsync(userId, session.Id);

            // Check achievements
            await _achievementService.CheckAndAwardAsync(userId);

            // First session affiliation bonus
            await _affiliationService.ProcessFirstSessionBonusAsync(userId);

            // Auto-post to feed
            var statsText = $"{duration}min · {Math.Round(session.TotalVolumeKg ?? 0)}kg · {exerciseCount} exercices";
            await _feedService.CreateAutoPostAsync(userId, PostType.SessionComplete, $"Seance terminee: {session.Title}", statsText, session.Id, "Session");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to award points/update challenges for session {SessionId}", session.Id);
            // Don't fail the session completion if gamification fails
        }

        return summary;
    }

    public async Task<SessionDto> AbandonSessionAsync(Guid sessionId, Guid userId)
    {
        var session = await _context.Sessions
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId);

        if (session == null) throw new KeyNotFoundException("Seance non trouvee");

        session.Status = SessionStatus.Abandoned;

        await _context.SaveChangesAsync();

        return await GetSessionAsync(sessionId, userId) ?? throw new Exception("Failed to abandon session");
    }

    public async Task<Session?> GetCurrentActiveSessionAsync(Guid userId)
    {
        return await _context.Sessions
            .FirstOrDefaultAsync(s => s.UserId == userId && s.Status == SessionStatus.InProgress);
    }

    private async Task<SessionSummaryDto> GenerateSummary(Session session, Guid userId)
    {
        var completedExercises = session.SessionExercises.Where(se => se.IsCompleted).ToList();
        var skippedExercises = session.SessionExercises.Where(se => se.IsSkipped).ToList();

        var stats = new SummaryStatsDto(
            PlannedDurationMinutes: session.PlannedDurationMinutes,
            ActualDurationMinutes: session.ActualDurationMinutes ?? 0,
            TotalVolumeKg: session.TotalVolumeKg ?? 0,
            TotalSets: session.TotalSets ?? 0,
            TotalReps: session.TotalReps ?? 0,
            AverageIntensityPercent: session.AverageIntensityPercent ?? 0,
            AverageFormScore: completedExercises.Average(se => se.AverageFormScore),
            ExercisesCompleted: completedExercises.Count,
            ExercisesSkipped: skippedExercises.Count
        );

        // TODO: Check for PRs, generate AI motivation message
        var motivationMessage = "Excellente seance! Tu as tout donne aujourd'hui. Yallah, on continue!";

        return new SessionSummaryDto(
            SessionId: session.Id,
            Title: session.Title,
            Stats: stats,
            NewPersonalRecords: new List<PersonalRecordDto>(),
            ComparisonWithLastSession: null,
            AiRecommendations: new List<string> { "Pense a bien t'hydrater", "Mange des proteines dans l'heure" },
            AiMotivationalMessage: motivationMessage,
            PostWorkoutNutrition: null,
            NextRecommendedWorkoutDate: DateTime.UtcNow.AddDays(1)
        );
    }

    private SessionDto MapToSessionDto(Session session)
    {
        var exercises = session.SessionExercises
            .OrderBy(se => se.OrderIndex)
            .Select(MapToSessionExerciseDto)
            .ToList();

        SessionStatsDto? stats = null;
        if (session.Status == SessionStatus.Completed)
        {
            stats = new SessionStatsDto(
                TotalVolumeKg: session.TotalVolumeKg ?? 0,
                TotalSets: session.TotalSets ?? 0,
                TotalReps: session.TotalReps ?? 0,
                AverageFormScore: null,
                ActualDurationMinutes: session.ActualDurationMinutes ?? 0
            );
        }

        return new SessionDto(
            Id: session.Id,
            Title: session.Title,
            Description: session.Description,
            PrimaryMuscleGroup: session.PrimaryMuscleGroup.ToString(),
            SecondaryMuscleGroups: session.SecondaryMuscleGroups.Select(m => m.ToString()).ToList(),
            PlannedDurationMinutes: session.PlannedDurationMinutes,
            Status: session.Status.ToString(),
            GeneratedAt: session.GeneratedAt,
            StartedAt: session.StartedAt,
            CompletedAt: session.CompletedAt,
            Exercises: exercises,
            Stats: stats
        );
    }

    private SessionExerciseDto MapToSessionExerciseDto(SessionExercise se)
    {
        List<CompletedSetDto>? completedSets = null;
        if (se.RepsCompleted.Any())
        {
            completedSets = se.RepsCompleted
                .Select((reps, i) => new CompletedSetDto(
                    SetNumber: i + 1,
                    Reps: reps,
                    WeightKg: se.WeightsCompletedKg.ElementAtOrDefault(i),
                    FormScore: se.FormScores.ElementAtOrDefault(i)
                ))
                .ToList();
        }

        return new SessionExerciseDto(
            Id: se.Id,
            ExerciseId: se.ExerciseId,
            ExerciseName: se.Exercise?.NameFr ?? "Exercice",
            ThumbnailUrl: se.Exercise?.ThumbnailUrl,
            VideoDemoUrl: se.Exercise?.VideoDemoUrl ?? se.Exercise?.VideoLocalPath ?? se.Exercise?.VideoBunnyUrl,
            OrderIndex: se.OrderIndex,
            SetsPlanned: se.SetsPlanned,
            RepsPlanned: se.RepsPlanned,
            WeightPlannedKg: se.WeightPlannedKg,
            RestSecondsPlanned: se.RestSecondsPlanned,
            IsCompleted: se.IsCompleted,
            CompletedSets: completedSets
        );
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
        return list.Any() ? list : new List<string> { "Bodyweight" };
    }
}
