using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BigBoss.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ProgrammeV2Fields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CooldownJson",
                table: "ProgrammeSessions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Phase",
                table: "ProgrammeSessions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SessionNote",
                table: "ProgrammeSessions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WarmupJson",
                table: "ProgrammeSessions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HydrationAdvice",
                table: "Programmes",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MealPlanWeeksJson",
                table: "Programmes",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MealTimingJson",
                table: "Programmes",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProgrammeGoalSummary",
                table: "Programmes",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RestDayCalories",
                table: "Programmes",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "SleepAdviceJson",
                table: "Programmes",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StressAdviceJson",
                table: "Programmes",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TrainingDayCalories",
                table: "Programmes",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "WelcomeMessage",
                table: "Programmes",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CooldownJson",
                table: "ProgrammeSessions");

            migrationBuilder.DropColumn(
                name: "Phase",
                table: "ProgrammeSessions");

            migrationBuilder.DropColumn(
                name: "SessionNote",
                table: "ProgrammeSessions");

            migrationBuilder.DropColumn(
                name: "WarmupJson",
                table: "ProgrammeSessions");

            migrationBuilder.DropColumn(
                name: "HydrationAdvice",
                table: "Programmes");

            migrationBuilder.DropColumn(
                name: "MealPlanWeeksJson",
                table: "Programmes");

            migrationBuilder.DropColumn(
                name: "MealTimingJson",
                table: "Programmes");

            migrationBuilder.DropColumn(
                name: "ProgrammeGoalSummary",
                table: "Programmes");

            migrationBuilder.DropColumn(
                name: "RestDayCalories",
                table: "Programmes");

            migrationBuilder.DropColumn(
                name: "SleepAdviceJson",
                table: "Programmes");

            migrationBuilder.DropColumn(
                name: "StressAdviceJson",
                table: "Programmes");

            migrationBuilder.DropColumn(
                name: "TrainingDayCalories",
                table: "Programmes");

            migrationBuilder.DropColumn(
                name: "WelcomeMessage",
                table: "Programmes");
        }
    }
}
