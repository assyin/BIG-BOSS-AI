using BigBoss.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace BigBoss.Infrastructure.Data;

public class BigBossDbContext : DbContext
{
    public BigBossDbContext(DbContextOptions<BigBossDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Exercise> Exercises => Set<Exercise>();
    public DbSet<Session> Sessions => Set<Session>();
    public DbSet<SessionExercise> SessionExercises => Set<SessionExercise>();
    public DbSet<Meal> Meals => Set<Meal>();
    public DbSet<NutritionPlan> NutritionPlans => Set<NutritionPlan>();
    public DbSet<BodyStat> BodyStats => Set<BodyStat>();
    public DbSet<ProgressPhoto> ProgressPhotos => Set<ProgressPhoto>();
    public DbSet<CoachMessage> CoachMessages => Set<CoachMessage>();
    public DbSet<Live> Lives => Set<Live>();
    public DbSet<Challenge> Challenges => Set<Challenge>();
    public DbSet<Recipe> Recipes => Set<Recipe>();
    public DbSet<Food> Foods => Set<Food>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Programme> Programmes => Set<Programme>();
    public DbSet<ProgrammeSession> ProgrammeSessions => Set<ProgrammeSession>();

    // Gamification
    public DbSet<PointTransaction> PointTransactions => Set<PointTransaction>();
    public DbSet<GamificationConfig> GamificationConfigs => Set<GamificationConfig>();
    public DbSet<FeatureFlag> FeatureFlags => Set<FeatureFlag>();
    public DbSet<Achievement> Achievements => Set<Achievement>();
    public DbSet<UserAchievement> UserAchievements => Set<UserAchievement>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Apply all configurations from assembly
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(BigBossDbContext).Assembly);

        // Global query filter for soft delete (if needed)
        // modelBuilder.Entity<User>().HasQueryFilter(u => !u.IsDeleted);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        // Auto-update UpdatedAt timestamp
        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.State == EntityState.Modified)
            {
                var updatedAtProperty = entry.Entity.GetType().GetProperty("UpdatedAt");
                if (updatedAtProperty != null && updatedAtProperty.PropertyType == typeof(DateTime))
                {
                    updatedAtProperty.SetValue(entry.Entity, DateTime.UtcNow);
                }
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}
