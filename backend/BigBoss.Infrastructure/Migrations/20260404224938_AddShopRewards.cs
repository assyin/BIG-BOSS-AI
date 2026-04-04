using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BigBoss.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddShopRewards : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ShopRewards",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    ImageUrl = table.Column<string>(type: "text", nullable: true),
                    Category = table.Column<int>(type: "integer", nullable: false),
                    PointsCost = table.Column<int>(type: "integer", nullable: false),
                    RealValueMad = table.Column<decimal>(type: "numeric", nullable: true),
                    Stock = table.Column<int>(type: "integer", nullable: true),
                    MaxPerUser = table.Column<int>(type: "integer", nullable: true),
                    RequiredSubscriptionTier = table.Column<int>(type: "integer", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    IsFeatured = table.Column<bool>(type: "boolean", nullable: false),
                    ValidFrom = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ValidUntil = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RedemptionInstructions = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShopRewards", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RewardRedemptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ShopRewardId = table.Column<Guid>(type: "uuid", nullable: false),
                    PointsSpent = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    RedemptionCode = table.Column<string>(type: "text", nullable: true),
                    ShippingAddress = table.Column<string>(type: "text", nullable: true),
                    AdminNotes = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ProcessedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ProcessedByAdminId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RewardRedemptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RewardRedemptions_ShopRewards_ShopRewardId",
                        column: x => x.ShopRewardId,
                        principalTable: "ShopRewards",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RewardRedemptions_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RewardRedemptions_ShopRewardId",
                table: "RewardRedemptions",
                column: "ShopRewardId");

            migrationBuilder.CreateIndex(
                name: "IX_RewardRedemptions_UserId",
                table: "RewardRedemptions",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RewardRedemptions");

            migrationBuilder.DropTable(
                name: "ShopRewards");
        }
    }
}
