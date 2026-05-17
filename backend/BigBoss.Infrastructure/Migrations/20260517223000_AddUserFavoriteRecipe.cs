using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BigBoss.Infrastructure.Migrations
{
    /// <summary>
    /// Sprint 3.3 — Table favoris recettes (sync multi-device).
    /// SQL raw pour éviter changements parasites snapshot.
    /// </summary>
    public partial class AddUserFavoriteRecipe : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS ""UserFavoriteRecipes"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""UserId"" uuid NOT NULL,
    ""RecipeId"" uuid NOT NULL,
    ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT ""FK_UserFavoriteRecipes_users_UserId""
        FOREIGN KEY (""UserId"") REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT ""FK_UserFavoriteRecipes_Recipes_RecipeId""
        FOREIGN KEY (""RecipeId"") REFERENCES ""Recipes"" (""Id"") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ""IX_UserFavoriteRecipes_UserId"" ON ""UserFavoriteRecipes"" (""UserId"");
CREATE UNIQUE INDEX IF NOT EXISTS ""IX_UserFavoriteRecipes_User_Recipe"" ON ""UserFavoriteRecipes"" (""UserId"", ""RecipeId"");
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"DROP TABLE IF EXISTS ""UserFavoriteRecipes"";");
        }
    }
}
