using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BigBoss.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class PremiumOnboarding : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ActivityLevel",
                table: "users",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "Bmr",
                table: "users",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "BodyFatPercent",
                table: "users",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CoachTonePreference",
                table: "users",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "DailyCalorieTarget",
                table: "users",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "DailyCarbTarget",
                table: "users",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "DailyFatTarget",
                table: "users",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "DailyProteinTarget",
                table: "users",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DietType",
                table: "users",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<List<string>>(
                name: "FoodAllergies",
                table: "users",
                type: "text[]",
                nullable: false,
                defaultValue: new List<string>());

            migrationBuilder.AddColumn<List<string>>(
                name: "Injuries",
                table: "users",
                type: "text[]",
                nullable: false,
                defaultValue: new List<string>());

            migrationBuilder.AddColumn<bool>(
                name: "IsRamadanMode",
                table: "users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "MealsPerDay",
                table: "users",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<List<string>>(
                name: "MedicalConditions",
                table: "users",
                type: "text[]",
                nullable: false,
                defaultValue: new List<string>());

            migrationBuilder.AddColumn<List<string>>(
                name: "MotivationReasons",
                table: "users",
                type: "text[]",
                nullable: false,
                defaultValue: new List<string>());

            migrationBuilder.AddColumn<bool>(
                name: "OnboardingCompleted",
                table: "users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "OnboardingCompletedAt",
                table: "users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<List<string>>(
                name: "PreferredCuisines",
                table: "users",
                type: "text[]",
                nullable: false,
                defaultValue: new List<string>());

            migrationBuilder.AddColumn<List<string>>(
                name: "PreferredDays",
                table: "users",
                type: "text[]",
                nullable: false,
                defaultValue: new List<string>());

            migrationBuilder.AddColumn<int>(
                name: "PreferredDuration",
                table: "users",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "PreferredTime",
                table: "users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<List<string>>(
                name: "PreviousBlockers",
                table: "users",
                type: "text[]",
                nullable: false,
                defaultValue: new List<string>());

            migrationBuilder.AddColumn<string>(
                name: "RecommendedSplit",
                table: "users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SleepHours",
                table: "users",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "StressLevel",
                table: "users",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "TargetDate",
                table: "users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TargetWeightKg",
                table: "users",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Tdee",
                table: "users",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TrainingFrequency",
                table: "users",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "WaistCm",
                table: "users",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DescriptionDarija",
                table: "Recipes",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IngredientsDarijaJson",
                table: "Recipes",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "StepsDarijaJson",
                table: "Recipes",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TitleDarija",
                table: "Recipes",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ActivityLevel",
                table: "users");

            migrationBuilder.DropColumn(
                name: "Bmr",
                table: "users");

            migrationBuilder.DropColumn(
                name: "BodyFatPercent",
                table: "users");

            migrationBuilder.DropColumn(
                name: "CoachTonePreference",
                table: "users");

            migrationBuilder.DropColumn(
                name: "DailyCalorieTarget",
                table: "users");

            migrationBuilder.DropColumn(
                name: "DailyCarbTarget",
                table: "users");

            migrationBuilder.DropColumn(
                name: "DailyFatTarget",
                table: "users");

            migrationBuilder.DropColumn(
                name: "DailyProteinTarget",
                table: "users");

            migrationBuilder.DropColumn(
                name: "DietType",
                table: "users");

            migrationBuilder.DropColumn(
                name: "FoodAllergies",
                table: "users");

            migrationBuilder.DropColumn(
                name: "Injuries",
                table: "users");

            migrationBuilder.DropColumn(
                name: "IsRamadanMode",
                table: "users");

            migrationBuilder.DropColumn(
                name: "MealsPerDay",
                table: "users");

            migrationBuilder.DropColumn(
                name: "MedicalConditions",
                table: "users");

            migrationBuilder.DropColumn(
                name: "MotivationReasons",
                table: "users");

            migrationBuilder.DropColumn(
                name: "OnboardingCompleted",
                table: "users");

            migrationBuilder.DropColumn(
                name: "OnboardingCompletedAt",
                table: "users");

            migrationBuilder.DropColumn(
                name: "PreferredCuisines",
                table: "users");

            migrationBuilder.DropColumn(
                name: "PreferredDays",
                table: "users");

            migrationBuilder.DropColumn(
                name: "PreferredDuration",
                table: "users");

            migrationBuilder.DropColumn(
                name: "PreferredTime",
                table: "users");

            migrationBuilder.DropColumn(
                name: "PreviousBlockers",
                table: "users");

            migrationBuilder.DropColumn(
                name: "RecommendedSplit",
                table: "users");

            migrationBuilder.DropColumn(
                name: "SleepHours",
                table: "users");

            migrationBuilder.DropColumn(
                name: "StressLevel",
                table: "users");

            migrationBuilder.DropColumn(
                name: "TargetDate",
                table: "users");

            migrationBuilder.DropColumn(
                name: "TargetWeightKg",
                table: "users");

            migrationBuilder.DropColumn(
                name: "Tdee",
                table: "users");

            migrationBuilder.DropColumn(
                name: "TrainingFrequency",
                table: "users");

            migrationBuilder.DropColumn(
                name: "WaistCm",
                table: "users");

            migrationBuilder.DropColumn(
                name: "DescriptionDarija",
                table: "Recipes");

            migrationBuilder.DropColumn(
                name: "IngredientsDarijaJson",
                table: "Recipes");

            migrationBuilder.DropColumn(
                name: "StepsDarijaJson",
                table: "Recipes");

            migrationBuilder.DropColumn(
                name: "TitleDarija",
                table: "Recipes");
        }
    }
}
