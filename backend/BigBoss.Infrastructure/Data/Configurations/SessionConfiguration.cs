using BigBoss.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BigBoss.Infrastructure.Data.Configurations;

public class SessionConfiguration : IEntityTypeConfiguration<Session>
{
    public void Configure(EntityTypeBuilder<Session> builder)
    {
        builder.ToTable("sessions");

        builder.HasKey(s => s.Id);

        builder.Property(s => s.Id)
            .HasColumnName("id")
            .HasDefaultValueSql("gen_random_uuid()");

        builder.Property(s => s.UserId)
            .HasColumnName("user_id")
            .IsRequired();

        builder.Property(s => s.Title)
            .HasColumnName("title")
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(s => s.Description)
            .HasColumnName("description")
            .HasMaxLength(1000);

        builder.Property(s => s.PrimaryMuscleGroup)
            .HasColumnName("primary_muscle_group")
            .HasConversion<string>();

        builder.Property(s => s.SecondaryMuscleGroups)
            .HasColumnName("secondary_muscle_groups")
            .HasColumnType("jsonb");

        builder.Property(s => s.GeneratedAt)
            .HasColumnName("generated_at")
            .HasDefaultValueSql("CURRENT_TIMESTAMP");

        builder.Property(s => s.StartedAt)
            .HasColumnName("started_at");

        builder.Property(s => s.CompletedAt)
            .HasColumnName("completed_at");

        builder.Property(s => s.PlannedDurationMinutes)
            .HasColumnName("planned_duration_minutes");

        builder.Property(s => s.ActualDurationMinutes)
            .HasColumnName("actual_duration_minutes");

        builder.Property(s => s.Status)
            .HasColumnName("status")
            .HasConversion<string>();

        builder.Property(s => s.TotalVolumeKg)
            .HasColumnName("total_volume_kg")
            .HasPrecision(10, 2);

        builder.Property(s => s.TotalSets)
            .HasColumnName("total_sets");

        builder.Property(s => s.TotalReps)
            .HasColumnName("total_reps");

        builder.Property(s => s.AverageIntensityPercent)
            .HasColumnName("average_intensity_percent")
            .HasPrecision(5, 2);

        builder.Property(s => s.RecoveryScore)
            .HasColumnName("recovery_score");

        builder.Property(s => s.UserFatigueRating)
            .HasColumnName("user_fatigue_rating");

        builder.Property(s => s.AiPromptContext)
            .HasColumnName("ai_prompt_context")
            .HasColumnType("text");

        builder.Property(s => s.AiResponseJson)
            .HasColumnName("ai_response_json")
            .HasColumnType("jsonb");

        builder.Property(s => s.AiSummary)
            .HasColumnName("ai_summary")
            .HasColumnType("text");

        builder.Property(s => s.PersonalRecords)
            .HasColumnName("personal_records")
            .HasColumnType("jsonb");

        builder.Property(s => s.Recommendations)
            .HasColumnName("recommendations")
            .HasColumnType("jsonb");

        builder.Property(s => s.CreatedAt)
            .HasColumnName("created_at")
            .HasDefaultValueSql("CURRENT_TIMESTAMP");

        builder.Property(s => s.UpdatedAt)
            .HasColumnName("updated_at")
            .HasDefaultValueSql("CURRENT_TIMESTAMP");

        // Relationships
        builder.HasOne(s => s.User)
            .WithMany(u => u.Sessions)
            .HasForeignKey(s => s.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Indexes
        builder.HasIndex(s => s.UserId);
        builder.HasIndex(s => s.Status);
        builder.HasIndex(s => s.GeneratedAt);
        builder.HasIndex(s => new { s.UserId, s.Status });
    }
}

public class SessionExerciseConfiguration : IEntityTypeConfiguration<SessionExercise>
{
    public void Configure(EntityTypeBuilder<SessionExercise> builder)
    {
        builder.ToTable("session_exercises");

        builder.HasKey(se => se.Id);

        builder.Property(se => se.Id)
            .HasColumnName("id")
            .HasDefaultValueSql("gen_random_uuid()");

        builder.Property(se => se.SessionId)
            .HasColumnName("session_id")
            .IsRequired();

        builder.Property(se => se.ExerciseId)
            .HasColumnName("exercise_id")
            .IsRequired();

        builder.Property(se => se.OrderIndex)
            .HasColumnName("order_index");

        builder.Property(se => se.SetsPlanned)
            .HasColumnName("sets_planned");

        builder.Property(se => se.RepsPlanned)
            .HasColumnName("reps_planned");

        builder.Property(se => se.WeightPlannedKg)
            .HasColumnName("weight_planned_kg")
            .HasPrecision(6, 2);

        builder.Property(se => se.RestSecondsPlanned)
            .HasColumnName("rest_seconds_planned")
            .HasDefaultValue(90);

        builder.Property(se => se.SetsCompleted)
            .HasColumnName("sets_completed");

        builder.Property(se => se.RepsCompleted)
            .HasColumnName("reps_completed")
            .HasColumnType("jsonb");

        builder.Property(se => se.WeightsCompletedKg)
            .HasColumnName("weights_completed_kg")
            .HasColumnType("jsonb");

        builder.Property(se => se.RestSecondsActual)
            .HasColumnName("rest_seconds_actual")
            .HasColumnType("jsonb");

        builder.Property(se => se.FormScores)
            .HasColumnName("form_scores")
            .HasColumnType("jsonb");

        builder.Property(se => se.AverageFormScore)
            .HasColumnName("average_form_score")
            .HasPrecision(5, 2);

        builder.Property(se => se.UserNotes)
            .HasColumnName("user_notes")
            .HasMaxLength(500);

        builder.Property(se => se.AiNotes)
            .HasColumnName("ai_notes")
            .HasMaxLength(500);

        // Sprint 3.2 — idempotence offline replay
        builder.Property(se => se.ProcessedClientUuids)
            .HasColumnName("processed_client_uuids")
            .HasColumnType("jsonb");

        builder.Property(se => se.IsCompleted)
            .HasColumnName("is_completed")
            .HasDefaultValue(false);

        builder.Property(se => se.IsSkipped)
            .HasColumnName("is_skipped")
            .HasDefaultValue(false);

        builder.Property(se => se.SkipReason)
            .HasColumnName("skip_reason")
            .HasMaxLength(200);

        builder.Property(se => se.StartedAt)
            .HasColumnName("started_at");

        builder.Property(se => se.CompletedAt)
            .HasColumnName("completed_at");

        // Relationships
        builder.HasOne(se => se.Session)
            .WithMany(s => s.SessionExercises)
            .HasForeignKey(se => se.SessionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(se => se.Exercise)
            .WithMany(e => e.SessionExercises)
            .HasForeignKey(se => se.ExerciseId)
            .OnDelete(DeleteBehavior.Restrict);

        // Indexes
        builder.HasIndex(se => se.SessionId);
        builder.HasIndex(se => se.ExerciseId);
    }
}
