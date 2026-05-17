using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BigBoss.Infrastructure.Migrations
{
    /// <summary>
    /// Sprint 2 Phase A — crée les tables Subscriptions + Payments.
    /// Écrit manuellement en SQL raw pour éviter les changements parasites du model snapshot.
    /// </summary>
    public partial class AddSubsPaymentSprint2 : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
CREATE TABLE IF NOT EXISTS ""Subscriptions"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""UserId"" uuid NOT NULL,
    ""Tier"" integer NOT NULL,
    ""Status"" integer NOT NULL DEFAULT 0,
    ""Period"" integer NOT NULL DEFAULT 0,
    ""AmountMad"" numeric NOT NULL DEFAULT 0,
    ""Provider"" integer NOT NULL,
    ""StripeSubscriptionId"" text,
    ""CmiContractId"" text,
    ""StartedAt"" timestamp with time zone NOT NULL DEFAULT now(),
    ""ExpiresAt"" timestamp with time zone NOT NULL,
    ""AutoRenew"" boolean NOT NULL DEFAULT true,
    ""CancelledAt"" timestamp with time zone,
    ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT now(),
    ""UpdatedAt"" timestamp with time zone,
    CONSTRAINT ""FK_Subscriptions_users_UserId""
        FOREIGN KEY (""UserId"") REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ""IX_Subscriptions_UserId"" ON ""Subscriptions"" (""UserId"");
CREATE INDEX IF NOT EXISTS ""IX_Subscriptions_Status_ExpiresAt"" ON ""Subscriptions"" (""Status"", ""ExpiresAt"");
CREATE INDEX IF NOT EXISTS ""IX_Subscriptions_StripeSubscriptionId"" ON ""Subscriptions"" (""StripeSubscriptionId"") WHERE ""StripeSubscriptionId"" IS NOT NULL;

CREATE TABLE IF NOT EXISTS ""Payments"" (
    ""Id"" uuid NOT NULL PRIMARY KEY,
    ""UserId"" uuid NOT NULL,
    ""SubscriptionId"" uuid,
    ""Provider"" integer NOT NULL,
    ""Status"" integer NOT NULL DEFAULT 0,
    ""AmountMad"" numeric NOT NULL DEFAULT 0,
    ""Currency"" text NOT NULL DEFAULT 'MAD',
    ""ExchangeRate"" numeric,
    ""ProviderTransactionId"" text,
    ""IdempotencyKey"" text,
    ""RawWebhookPayload"" text,
    ""RefundReason"" text,
    ""CreatedAt"" timestamp with time zone NOT NULL DEFAULT now(),
    ""CompletedAt"" timestamp with time zone,
    CONSTRAINT ""FK_Payments_users_UserId""
        FOREIGN KEY (""UserId"") REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT ""FK_Payments_Subscriptions_SubscriptionId""
        FOREIGN KEY (""SubscriptionId"") REFERENCES ""Subscriptions"" (""Id"") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ""IX_Payments_UserId"" ON ""Payments"" (""UserId"");
CREATE INDEX IF NOT EXISTS ""IX_Payments_SubscriptionId"" ON ""Payments"" (""SubscriptionId"") WHERE ""SubscriptionId"" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ""IX_Payments_IdempotencyKey"" ON ""Payments"" (""IdempotencyKey"") WHERE ""IdempotencyKey"" IS NOT NULL;
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DROP TABLE IF EXISTS ""Payments"";
DROP TABLE IF EXISTS ""Subscriptions"";
");
        }
    }
}
