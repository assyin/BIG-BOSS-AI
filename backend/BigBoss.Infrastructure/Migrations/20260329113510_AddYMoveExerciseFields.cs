using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BigBoss.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddYMoveExerciseFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "description_fr",
                table: "exercises",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<List<string>>(
                name: "erreurs_courantes_fr",
                table: "exercises",
                type: "jsonb",
                nullable: false);

            migrationBuilder.AddColumn<bool>(
                name: "has_video",
                table: "exercises",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<List<string>>(
                name: "instructions_en",
                table: "exercises",
                type: "jsonb",
                nullable: false);

            migrationBuilder.AddColumn<List<string>>(
                name: "instructions_fr",
                table: "exercises",
                type: "jsonb",
                nullable: false);

            migrationBuilder.AddColumn<List<string>>(
                name: "tips_coach_fr",
                table: "exercises",
                type: "jsonb",
                nullable: false);

            migrationBuilder.AddColumn<List<string>>(
                name: "tips_en",
                table: "exercises",
                type: "jsonb",
                nullable: false);

            migrationBuilder.AddColumn<string>(
                name: "ymove_id",
                table: "exercises",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ymove_slug",
                table: "exercises",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_exercises_ymove_id",
                table: "exercises",
                column: "ymove_id",
                unique: true,
                filter: "ymove_id IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_exercises_ymove_id",
                table: "exercises");

            migrationBuilder.DropColumn(
                name: "description_fr",
                table: "exercises");

            migrationBuilder.DropColumn(
                name: "erreurs_courantes_fr",
                table: "exercises");

            migrationBuilder.DropColumn(
                name: "has_video",
                table: "exercises");

            migrationBuilder.DropColumn(
                name: "instructions_en",
                table: "exercises");

            migrationBuilder.DropColumn(
                name: "instructions_fr",
                table: "exercises");

            migrationBuilder.DropColumn(
                name: "tips_coach_fr",
                table: "exercises");

            migrationBuilder.DropColumn(
                name: "tips_en",
                table: "exercises");

            migrationBuilder.DropColumn(
                name: "ymove_id",
                table: "exercises");

            migrationBuilder.DropColumn(
                name: "ymove_slug",
                table: "exercises");
        }
    }
}
