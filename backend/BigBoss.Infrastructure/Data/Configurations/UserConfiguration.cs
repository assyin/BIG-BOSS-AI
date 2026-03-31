using BigBoss.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BigBoss.Infrastructure.Data.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("users");

        builder.HasKey(u => u.Id);

        builder.Property(u => u.Id)
            .HasColumnName("id")
            .HasDefaultValueSql("gen_random_uuid()");

        builder.Property(u => u.Email)
            .HasColumnName("email")
            .HasMaxLength(255)
            .IsRequired();

        builder.HasIndex(u => u.Email)
            .IsUnique();

        builder.Property(u => u.PasswordHash)
            .HasColumnName("password_hash")
            .HasMaxLength(255)
            .IsRequired();

        builder.Property(u => u.Name)
            .HasColumnName("name")
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(u => u.Phone)
            .HasColumnName("phone")
            .HasMaxLength(20);

        builder.Property(u => u.BirthDate)
            .HasColumnName("birth_date");

        builder.Property(u => u.AvatarUrl)
            .HasColumnName("avatar_url")
            .HasMaxLength(500);

        builder.Property(u => u.WeightKg)
            .HasColumnName("weight_kg")
            .HasPrecision(5, 2);

        builder.Property(u => u.HeightCm)
            .HasColumnName("height_cm")
            .HasPrecision(5, 2);

        builder.Property(u => u.Gender)
            .HasColumnName("gender")
            .HasMaxLength(10);

        builder.Property(u => u.Goal)
            .HasColumnName("goal")
            .HasConversion<string>();

        builder.Property(u => u.Level)
            .HasColumnName("level")
            .HasConversion<string>();

        builder.Property(u => u.AvailableEquipment)
            .HasColumnName("available_equipment")
            .HasConversion<int>();

        builder.Property(u => u.SubscriptionTier)
            .HasColumnName("subscription_tier")
            .HasConversion<string>();

        builder.Property(u => u.SubscriptionExpiresAt)
            .HasColumnName("subscription_expires_at");

        builder.Property(u => u.PreferredLanguage)
            .HasColumnName("preferred_language")
            .HasMaxLength(10)
            .HasDefaultValue("fr");

        builder.Property(u => u.NotificationsEnabled)
            .HasColumnName("notifications_enabled")
            .HasDefaultValue(true);

        builder.Property(u => u.CreatedAt)
            .HasColumnName("created_at")
            .HasDefaultValueSql("CURRENT_TIMESTAMP");

        builder.Property(u => u.UpdatedAt)
            .HasColumnName("updated_at")
            .HasDefaultValueSql("CURRENT_TIMESTAMP");

        builder.Property(u => u.LastLoginAt)
            .HasColumnName("last_login_at");

        builder.Property(u => u.RefreshToken)
            .HasColumnName("refresh_token")
            .HasMaxLength(500);

        builder.Property(u => u.RefreshTokenExpiresAt)
            .HasColumnName("refresh_token_expires_at");

        // Indexes
        builder.HasIndex(u => u.SubscriptionTier);
        builder.HasIndex(u => u.CreatedAt);
    }
}
