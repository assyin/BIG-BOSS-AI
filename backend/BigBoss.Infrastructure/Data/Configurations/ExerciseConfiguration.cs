using BigBoss.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BigBoss.Infrastructure.Data.Configurations;

public class ExerciseConfiguration : IEntityTypeConfiguration<Exercise>
{
    public void Configure(EntityTypeBuilder<Exercise> builder)
    {
        builder.ToTable("exercises");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.Id)
            .HasColumnName("id")
            .HasDefaultValueSql("gen_random_uuid()");

        // YMove fields
        builder.Property(e => e.YmoveId)
            .HasColumnName("ymove_id")
            .HasMaxLength(100);

        builder.Property(e => e.YmoveSlug)
            .HasColumnName("ymove_slug")
            .HasMaxLength(300);

        builder.Property(e => e.HasVideo)
            .HasColumnName("has_video")
            .HasDefaultValue(false);

        builder.Property(e => e.DescriptionFr)
            .HasColumnName("description_fr");

        builder.Property(e => e.InstructionsEn)
            .HasColumnName("instructions_en")
            .HasColumnType("jsonb");

        builder.Property(e => e.InstructionsFr)
            .HasColumnName("instructions_fr")
            .HasColumnType("jsonb");

        builder.Property(e => e.TipsEn)
            .HasColumnName("tips_en")
            .HasColumnType("jsonb");

        builder.Property(e => e.TipsCoachFr)
            .HasColumnName("tips_coach_fr")
            .HasColumnType("jsonb");

        builder.Property(e => e.ErreursCourantesFr)
            .HasColumnName("erreurs_courantes_fr")
            .HasColumnType("jsonb");

        builder.HasIndex(e => e.YmoveId).IsUnique().HasFilter("ymove_id IS NOT NULL");

        builder.Property(e => e.NameFr)
            .HasColumnName("name_fr")
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(e => e.NameAr)
            .HasColumnName("name_ar")
            .HasMaxLength(200);

        builder.Property(e => e.NameDarija)
            .HasColumnName("name_darija")
            .HasMaxLength(200);

        builder.Property(e => e.NameEn)
            .HasColumnName("name_en")
            .HasMaxLength(200);

        builder.Property(e => e.PrimaryMuscle)
            .HasColumnName("primary_muscle")
            .HasConversion<string>();

        builder.Property(e => e.SecondaryMuscles)
            .HasColumnName("secondary_muscles")
            .HasColumnType("jsonb");

        builder.Property(e => e.Category)
            .HasColumnName("category")
            .HasConversion<string>();

        builder.Property(e => e.Difficulty)
            .HasColumnName("difficulty")
            .HasConversion<string>();

        builder.Property(e => e.RequiredEquipment)
            .HasColumnName("required_equipment")
            .HasConversion<int>();

        builder.Property(e => e.VideoDemoUrl)
            .HasColumnName("video_demo_url")
            .HasMaxLength(500);

        builder.Property(e => e.VideoLocalPath)
            .HasColumnName("video_local_path")
            .HasMaxLength(500);

        builder.Property(e => e.VideoBunnyUrl)
            .HasColumnName("video_bunny_url")
            .HasMaxLength(1000);

        builder.Property(e => e.VideoFormUrl)
            .HasColumnName("video_form_url")
            .HasMaxLength(500);

        builder.Property(e => e.VideoMistakesUrl)
            .HasColumnName("video_mistakes_url")
            .HasMaxLength(500);

        builder.Property(e => e.VideoTipsUrl)
            .HasColumnName("video_tips_url")
            .HasMaxLength(500);

        builder.Property(e => e.ThumbnailUrl)
            .HasColumnName("thumbnail_url")
            .HasMaxLength(500);

        builder.Property(e => e.GifPreviewUrl)
            .HasColumnName("gif_preview_url")
            .HasMaxLength(500);

        builder.Property(e => e.CoachingCues)
            .HasColumnName("coaching_cues")
            .HasColumnType("jsonb");

        builder.Property(e => e.CommonMistakes)
            .HasColumnName("common_mistakes")
            .HasColumnType("jsonb");

        builder.Property(e => e.AlternativeExerciseIds)
            .HasColumnName("alternative_exercise_ids")
            .HasColumnType("jsonb");

        builder.Property(e => e.MinRepsHypertrophy).HasColumnName("min_reps_hypertrophy");
        builder.Property(e => e.MaxRepsHypertrophy).HasColumnName("max_reps_hypertrophy");
        builder.Property(e => e.MinRepsStrength).HasColumnName("min_reps_strength");
        builder.Property(e => e.MaxRepsStrength).HasColumnName("max_reps_strength");
        builder.Property(e => e.MinRepsEndurance).HasColumnName("min_reps_endurance");
        builder.Property(e => e.MaxRepsEndurance).HasColumnName("max_reps_endurance");

        builder.Property(e => e.RecommendedTempo)
            .HasColumnName("recommended_tempo")
            .HasMaxLength(20);

        builder.Property(e => e.ComplexityScore)
            .HasColumnName("complexity_score")
            .HasDefaultValue(5);

        builder.Property(e => e.Contraindications)
            .HasColumnName("contraindications")
            .HasColumnType("jsonb");

        builder.Property(e => e.RiskFactors)
            .HasColumnName("risk_factors")
            .HasColumnType("jsonb");

        builder.Property(e => e.SearchTags)
            .HasColumnName("search_tags")
            .HasColumnType("jsonb");

        builder.Property(e => e.IsActive)
            .HasColumnName("is_active")
            .HasDefaultValue(true);

        builder.Property(e => e.CreatedAt)
            .HasColumnName("created_at")
            .HasDefaultValueSql("CURRENT_TIMESTAMP");

        builder.Property(e => e.UpdatedAt)
            .HasColumnName("updated_at")
            .HasDefaultValueSql("CURRENT_TIMESTAMP");

        // Indexes
        builder.HasIndex(e => e.PrimaryMuscle);
        builder.HasIndex(e => e.Category);
        builder.HasIndex(e => e.Difficulty);
        builder.HasIndex(e => e.IsActive);
    }
}
