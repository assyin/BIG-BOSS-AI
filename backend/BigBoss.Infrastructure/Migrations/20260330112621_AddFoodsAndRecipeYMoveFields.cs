using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BigBoss.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddFoodsAndRecipeYMoveFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "Calories",
                table: "Recipes",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "CarbsG",
                table: "Recipes",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CuisineType",
                table: "Recipes",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Recipes",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<List<string>>(
                name: "DietTags",
                table: "Recipes",
                type: "text[]",
                nullable: false);

            migrationBuilder.AddColumn<string>(
                name: "DifficultyLevel",
                table: "Recipes",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "FatG",
                table: "Recipes",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MealType",
                table: "Recipes",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ProteinG",
                table: "Recipes",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Title",
                table: "Recipes",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "YmoveId",
                table: "Recipes",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "YmoveSlug",
                table: "Recipes",
                type: "text",
                nullable: true);

            // video_bunny_url and video_local_path already exist (added manually)

            migrationBuilder.CreateTable(
                name: "Foods",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    YmoveId = table.Column<string>(type: "text", nullable: true),
                    NameEn = table.Column<string>(type: "text", nullable: false),
                    DisplayName = table.Column<string>(type: "text", nullable: true),
                    ShortName = table.Column<string>(type: "text", nullable: true),
                    NameFr = table.Column<string>(type: "text", nullable: true),
                    Category = table.Column<string>(type: "text", nullable: false),
                    ServingSizeG = table.Column<decimal>(type: "numeric", nullable: false),
                    ServingDescription = table.Column<string>(type: "text", nullable: true),
                    Calories = table.Column<decimal>(type: "numeric", nullable: false),
                    ProteinG = table.Column<decimal>(type: "numeric", nullable: false),
                    CarbsG = table.Column<decimal>(type: "numeric", nullable: false),
                    FatG = table.Column<decimal>(type: "numeric", nullable: false),
                    FiberG = table.Column<decimal>(type: "numeric", nullable: true),
                    SugarG = table.Column<decimal>(type: "numeric", nullable: true),
                    SodiumMg = table.Column<decimal>(type: "numeric", nullable: true),
                    CholesterolMg = table.Column<decimal>(type: "numeric", nullable: true),
                    SaturatedFatG = table.Column<decimal>(type: "numeric", nullable: true),
                    Barcode = table.Column<string>(type: "text", nullable: true),
                    ImageUrl = table.Column<string>(type: "text", nullable: true),
                    Source = table.Column<string>(type: "text", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Foods", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Foods");

            migrationBuilder.DropColumn(
                name: "Calories",
                table: "Recipes");

            migrationBuilder.DropColumn(
                name: "CarbsG",
                table: "Recipes");

            migrationBuilder.DropColumn(
                name: "CuisineType",
                table: "Recipes");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "Recipes");

            migrationBuilder.DropColumn(
                name: "DietTags",
                table: "Recipes");

            migrationBuilder.DropColumn(
                name: "DifficultyLevel",
                table: "Recipes");

            migrationBuilder.DropColumn(
                name: "FatG",
                table: "Recipes");

            migrationBuilder.DropColumn(
                name: "MealType",
                table: "Recipes");

            migrationBuilder.DropColumn(
                name: "ProteinG",
                table: "Recipes");

            migrationBuilder.DropColumn(
                name: "Title",
                table: "Recipes");

            migrationBuilder.DropColumn(
                name: "YmoveId",
                table: "Recipes");

            migrationBuilder.DropColumn(
                name: "YmoveSlug",
                table: "Recipes");

            // video_bunny_url and video_local_path kept
        }
    }
}
