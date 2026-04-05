using BigBoss.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Net.Http;
using System.Text;
using System.Text.Json;

namespace BigBoss.Infrastructure.Services;

public interface IPushNotificationService
{
    Task SendToUserAsync(Guid userId, string title, string body, object? data = null);
    Task SendToAllAsync(string title, string body, object? data = null);
    Task SaveTokenAsync(Guid userId, string token);
}

public class PushNotificationService : IPushNotificationService
{
    private readonly BigBossDbContext _context;
    private readonly HttpClient _httpClient;
    private readonly ILogger<PushNotificationService> _logger;

    public PushNotificationService(BigBossDbContext context, ILogger<PushNotificationService> logger)
    {
        _context = context;
        _httpClient = new HttpClient();
        _logger = logger;
    }

    public async Task SaveTokenAsync(Guid userId, string token)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return;
        user.PushToken = token;
        await _context.SaveChangesAsync();
    }

    public async Task SendToUserAsync(Guid userId, string title, string body, object? data = null)
    {
        var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (user?.PushToken == null) return;

        await SendExpoPushAsync(user.PushToken, title, body, data);
    }

    public async Task SendToAllAsync(string title, string body, object? data = null)
    {
        var tokens = await _context.Users.AsNoTracking()
            .Where(u => u.PushToken != null && u.NotificationsEnabled && !u.IsSuspended)
            .Select(u => u.PushToken!)
            .ToListAsync();

        // Expo push API supports batch of 100
        foreach (var batch in tokens.Chunk(100))
        {
            var messages = batch.Select(token => new
            {
                to = token,
                title,
                body,
                data,
                sound = "default",
            }).ToArray();

            await SendExpoPushBatchAsync(messages);
        }

        _logger.LogInformation("Push sent to {Count} users: {Title}", tokens.Count, title);
    }

    private async Task SendExpoPushAsync(string token, string title, string body, object? data = null)
    {
        var message = new[]
        {
            new { to = token, title, body, data, sound = "default" }
        };
        await SendExpoPushBatchAsync(message);
    }

    private async Task SendExpoPushBatchAsync(object[] messages)
    {
        try
        {
            var client = _httpClient;
            var json = JsonSerializer.Serialize(messages);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await client.PostAsync("https://exp.host/--/api/v2/push/send", content);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("Expo push failed: {StatusCode} {Error}", response.StatusCode, error);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send push notification");
        }
    }
}
