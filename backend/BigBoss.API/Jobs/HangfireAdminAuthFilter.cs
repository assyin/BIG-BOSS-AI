using System.Net;
using Hangfire.Dashboard;

namespace BigBoss.API.Jobs;

/// <summary>
/// Sprint 3.1 — Restreint l'accès au /hangfire dashboard aux admins.
///
/// Authentification basique : header X-Hangfire-Admin-Token vs config.
/// (En localhost dev sans token, l'accès est autorisé.)
/// </summary>
public class HangfireAdminAuthFilter : IDashboardAuthorizationFilter
{
    private readonly string? _expectedToken;
    private readonly bool _isDevelopment;

    public HangfireAdminAuthFilter(IConfiguration config, IWebHostEnvironment env)
    {
        _expectedToken = config["BBF_HANGFIRE_ADMIN_TOKEN"];
        _isDevelopment = env.IsDevelopment();
    }

    public bool Authorize(DashboardContext context)
    {
        var httpContext = context.GetHttpContext();
        var remoteIp = httpContext.Connection.RemoteIpAddress;

        // 1. Si token configuré, autoriser via header ou query string
        if (!string.IsNullOrEmpty(_expectedToken))
        {
            var headerToken = httpContext.Request.Headers["X-Hangfire-Admin-Token"].ToString();
            var queryToken = httpContext.Request.Query["token"].ToString();
            if (headerToken == _expectedToken || queryToken == _expectedToken) return true;
        }

        // 2. Sans token : autoriser uniquement les requêtes loopback (127.0.0.1, ::1)
        if (remoteIp != null && IPAddress.IsLoopback(remoteIp)) return true;

        return false;
    }
}
