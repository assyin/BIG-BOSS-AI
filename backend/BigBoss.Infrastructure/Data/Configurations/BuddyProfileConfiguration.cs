using BigBoss.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BigBoss.Infrastructure.Data.Configurations;

/// <summary>
/// Sprint 5.2 — Mapping BuddyProfile.
/// Goals + AvailableSlots stockés en jsonb (cohérent avec autres List<string> du projet).
/// </summary>
public class BuddyProfileConfiguration : IEntityTypeConfiguration<BuddyProfile>
{
    public void Configure(EntityTypeBuilder<BuddyProfile> builder)
    {
        builder.ToTable("BuddyProfiles");

        builder.HasKey(p => p.Id);

        builder.Property(p => p.Goals)
            .HasColumnType("jsonb");

        builder.Property(p => p.AvailableSlots)
            .HasColumnType("jsonb");

        builder.HasIndex(p => p.UserId).IsUnique();
        builder.HasIndex(p => p.City);
    }
}

/// <summary>Sprint 5.2 — Mapping BuddyConnection.</summary>
public class BuddyConnectionConfiguration : IEntityTypeConfiguration<BuddyConnection>
{
    public void Configure(EntityTypeBuilder<BuddyConnection> builder)
    {
        builder.ToTable("BuddyConnections");

        builder.HasKey(c => c.Id);

        builder.Property(c => c.Status)
            .HasConversion<int>();

        builder.HasIndex(c => new { c.RequesterId, c.AddresseeId }).IsUnique();
        builder.HasIndex(c => c.AddresseeId);

        // FKs sans cascade dans les deux sens pour éviter double cascade error
        builder.HasOne(c => c.Requester)
            .WithMany()
            .HasForeignKey(c => c.RequesterId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(c => c.Addressee)
            .WithMany()
            .HasForeignKey(c => c.AddresseeId)
            .OnDelete(DeleteBehavior.Restrict); // évite cycle cascade
    }
}
