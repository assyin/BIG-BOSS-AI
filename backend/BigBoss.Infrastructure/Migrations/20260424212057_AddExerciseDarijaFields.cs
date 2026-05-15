using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BigBoss.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddExerciseDarijaFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DescriptionDarija",
                table: "exercises",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<List<string>>(
                name: "ErreursCourantesDarija",
                table: "exercises",
                type: "text[]",
                nullable: false,
                defaultValueSql: "ARRAY[]::text[]");

            migrationBuilder.AddColumn<List<string>>(
                name: "InstructionsDarija",
                table: "exercises",
                type: "text[]",
                nullable: false,
                defaultValueSql: "ARRAY[]::text[]");

            migrationBuilder.AddColumn<List<string>>(
                name: "TipsCoachDarija",
                table: "exercises",
                type: "text[]",
                nullable: false,
                defaultValueSql: "ARRAY[]::text[]");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DescriptionDarija",
                table: "exercises");

            migrationBuilder.DropColumn(
                name: "ErreursCourantesDarija",
                table: "exercises");

            migrationBuilder.DropColumn(
                name: "InstructionsDarija",
                table: "exercises");

            migrationBuilder.DropColumn(
                name: "TipsCoachDarija",
                table: "exercises");
        }
    }
}
