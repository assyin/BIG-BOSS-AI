using BigBoss.Core.Entities;
using BigBoss.Core.Enums;
using BigBoss.Core.Interfaces;
using BigBoss.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BigBoss.Infrastructure.Services;

public class SubscriptionService : ISubscriptionService
{
    private readonly BigBossDbContext _context;
    private readonly ILogger<SubscriptionService> _logger;

    public SubscriptionService(BigBossDbContext context, ILogger<SubscriptionService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Subscription?> GetCurrentAsync(Guid userId)
    {
        return await _context.Subscriptions
            .Where(s => s.UserId == userId && (s.Status == SubscriptionStatus.Active || s.Status == SubscriptionStatus.Trial || s.Status == SubscriptionStatus.Cancelled))
            .Where(s => s.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync();
    }

    public async Task<IReadOnlyList<Subscription>> GetHistoryAsync(Guid userId)
    {
        return await _context.Subscriptions
            .AsNoTracking()
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();
    }

    public async Task<Subscription> CreateAsync(
        Guid userId,
        SubscriptionTier tier,
        RenewalPeriod period,
        PaymentProvider provider,
        decimal amountMad,
        string? externalId = null)
    {
        if (tier == SubscriptionTier.Free)
            throw new InvalidOperationException("Free tier does not create a Subscription row.");

        // Cancel any existing active subscription
        var existing = await GetCurrentAsync(userId);
        if (existing != null)
        {
            existing.Status = SubscriptionStatus.Cancelled;
            existing.CancelledAt = DateTime.UtcNow;
            existing.UpdatedAt = DateTime.UtcNow;
        }

        var expires = DateTime.UtcNow.Add(PeriodDuration(period));
        var sub = new Subscription
        {
            UserId = userId,
            Tier = tier,
            Status = SubscriptionStatus.Active,
            Period = period,
            AmountMad = amountMad,
            Provider = provider,
            StripeSubscriptionId = provider == PaymentProvider.Stripe ? externalId : null,
            CmiContractId = provider == PaymentProvider.Cmi ? externalId : null,
            StartedAt = DateTime.UtcNow,
            ExpiresAt = expires,
            AutoRenew = true,
        };
        _context.Subscriptions.Add(sub);
        await _context.SaveChangesAsync();

        await SyncUserTierAsync(userId);
        _logger.LogInformation("Subscription created {SubId} for user {UserId}, tier={Tier}, expires={ExpiresAt}", sub.Id, userId, tier, expires);
        return sub;
    }

    public async Task<Subscription?> CancelAsync(Guid userId)
    {
        var current = await GetCurrentAsync(userId);
        if (current == null) return null;

        current.AutoRenew = false;
        current.Status = SubscriptionStatus.Cancelled;
        current.CancelledAt = DateTime.UtcNow;
        current.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Subscription {SubId} cancelled for user {UserId} (active until {ExpiresAt})", current.Id, userId, current.ExpiresAt);
        return current;
    }

    public async Task<Payment> RecordPaymentAsync(
        Guid userId,
        Guid? subscriptionId,
        PaymentProvider provider,
        PaymentStatus status,
        decimal amountMad,
        string currency = "MAD",
        string? providerTxId = null,
        string? idempotencyKey = null,
        string? rawWebhook = null)
    {
        // Idempotence
        if (!string.IsNullOrEmpty(idempotencyKey))
        {
            var existing = await _context.Payments.FirstOrDefaultAsync(p => p.IdempotencyKey == idempotencyKey);
            if (existing != null)
            {
                _logger.LogInformation("Payment idempotent skip — key {Key} already processed (id={PaymentId})", idempotencyKey, existing.Id);
                return existing;
            }
        }

        var payment = new Payment
        {
            UserId = userId,
            SubscriptionId = subscriptionId,
            Provider = provider,
            Status = status,
            AmountMad = amountMad,
            Currency = currency,
            ProviderTransactionId = providerTxId,
            IdempotencyKey = idempotencyKey,
            RawWebhookPayload = rawWebhook,
            CompletedAt = status == PaymentStatus.Succeeded || status == PaymentStatus.Failed
                ? DateTime.UtcNow
                : null,
        };
        _context.Payments.Add(payment);

        // Extend subscription si payment réussi et renouvellement
        if (status == PaymentStatus.Succeeded && subscriptionId.HasValue)
        {
            var sub = await _context.Subscriptions.FirstOrDefaultAsync(s => s.Id == subscriptionId.Value);
            if (sub != null && sub.AutoRenew)
            {
                sub.ExpiresAt = sub.ExpiresAt.Add(PeriodDuration(sub.Period));
                sub.Status = SubscriptionStatus.Active;
                sub.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _context.SaveChangesAsync();
        await SyncUserTierAsync(userId);
        _logger.LogInformation("Payment {PaymentId} recorded for user {UserId}, provider={Provider}, status={Status}, amount={Amount} {Currency}",
            payment.Id, userId, provider, status, amountMad, currency);
        return payment;
    }

    public async Task SyncUserTierAsync(Guid userId)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return;

        var current = await GetCurrentAsync(userId);
        if (current != null)
        {
            user.SubscriptionTier = current.Tier;
            user.SubscriptionExpiresAt = current.ExpiresAt;
        }
        else
        {
            user.SubscriptionTier = SubscriptionTier.Free;
            user.SubscriptionExpiresAt = null;
        }
        await _context.SaveChangesAsync();
    }

    public decimal GetPriceMad(SubscriptionTier tier, RenewalPeriod period)
    {
        // Prix de base mensuels (snapshot — pourra venir de AppConfig plus tard)
        var monthly = tier switch
        {
            SubscriptionTier.Premium => 79m,
            SubscriptionTier.Elite => 149m,
            _ => 0m,
        };
        return period switch
        {
            RenewalPeriod.Monthly => monthly,
            RenewalPeriod.Yearly => monthly * 10m, // 2 mois offerts à l'année
            _ => monthly,
        };
    }

    private static TimeSpan PeriodDuration(RenewalPeriod period) => period switch
    {
        RenewalPeriod.Monthly => TimeSpan.FromDays(30),
        RenewalPeriod.Yearly => TimeSpan.FromDays(365),
        _ => TimeSpan.FromDays(30),
    };
}
