using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BigBoss.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddChallengeParticipation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DescriptionAr",
                table: "Challenges",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsFinalized",
                table: "Challenges",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsVisibleToFree",
                table: "Challenges",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "MaxParticipants",
                table: "Challenges",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Metric",
                table: "Challenges",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "PointsForCompletion",
                table: "Challenges",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "PointsForParticipation",
                table: "Challenges",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "PointsForTop3",
                table: "Challenges",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "RequiredSubscriptionTier",
                table: "Challenges",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TargetValue",
                table: "Challenges",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TitleAr",
                table: "Challenges",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ChallengeParticipations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ChallengeId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    JoinedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CurrentProgress = table.Column<decimal>(type: "numeric", nullable: false),
                    IsCompleted = table.Column<bool>(type: "boolean", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    FinalRank = table.Column<int>(type: "integer", nullable: true),
                    PointsAwarded = table.Column<int>(type: "integer", nullable: false),
                    IsDisqualified = table.Column<bool>(type: "boolean", nullable: false),
                    DisqualifyReason = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChallengeParticipations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ChallengeParticipations_Challenges_ChallengeId",
                        column: x => x.ChallengeId,
                        principalTable: "Challenges",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ChallengeParticipations_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ChallengeParticipations_ChallengeId",
                table: "ChallengeParticipations",
                column: "ChallengeId");

            migrationBuilder.CreateIndex(
                name: "IX_ChallengeParticipations_UserId",
                table: "ChallengeParticipations",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ChallengeParticipations");

            migrationBuilder.DropColumn(
                name: "DescriptionAr",
                table: "Challenges");

            migrationBuilder.DropColumn(
                name: "IsFinalized",
                table: "Challenges");

            migrationBuilder.DropColumn(
                name: "IsVisibleToFree",
                table: "Challenges");

            migrationBuilder.DropColumn(
                name: "MaxParticipants",
                table: "Challenges");

            migrationBuilder.DropColumn(
                name: "Metric",
                table: "Challenges");

            migrationBuilder.DropColumn(
                name: "PointsForCompletion",
                table: "Challenges");

            migrationBuilder.DropColumn(
                name: "PointsForParticipation",
                table: "Challenges");

            migrationBuilder.DropColumn(
                name: "PointsForTop3",
                table: "Challenges");

            migrationBuilder.DropColumn(
                name: "RequiredSubscriptionTier",
                table: "Challenges");

            migrationBuilder.DropColumn(
                name: "TargetValue",
                table: "Challenges");

            migrationBuilder.DropColumn(
                name: "TitleAr",
                table: "Challenges");
        }
    }
}
