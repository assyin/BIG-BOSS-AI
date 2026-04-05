using BigBoss.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace BigBoss.API.Hubs;

[Authorize(Roles = "Admin")]
public class AdminDashboardHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        await base.OnConnectedAsync();
        await Clients.Caller.SendAsync("Connected", "Dashboard connecte en temps reel");
    }
}

/// <summary>
/// Background service that pushes real-time stats to admin dashboard every 30 seconds
/// </summary>
public class AdminDashboardBroadcaster : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly IHubContext<AdminDashboardHub> _hub;

    public AdminDashboardBroadcaster(IServiceProvider services, IHubContext<AdminDashboardHub> hub)
    {
        _services = services;
        _hub = hub;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _services.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<BigBossDbContext>();

                var today = DateTime.UtcNow.Date;
                var stats = new
                {
                    totalUsers = await context.Users.CountAsync(stoppingToken),
                    usersToday = await context.Users.CountAsync(u => u.CreatedAt >= today, stoppingToken),
                    sessionsToday = await context.Sessions.CountAsync(s => s.CompletedAt.HasValue && s.CompletedAt >= today, stoppingToken),
                    pointsInCirculation = await context.Users.SumAsync(u => u.PointsBalance, stoppingToken),
                    postsToday = await context.Posts.CountAsync(p => p.CreatedAt >= today, stoppingToken),
                    activeChallenges = await context.Challenges.CountAsync(c => c.IsActive && c.EndDate >= DateTime.UtcNow, stoppingToken),
                    timestamp = DateTime.UtcNow,
                };

                await _hub.Clients.All.SendAsync("DashboardUpdate", stats, stoppingToken);
            }
            catch
            {
                // Silently continue
            }

            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        }
    }
}
