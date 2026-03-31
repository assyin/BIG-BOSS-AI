using System.Collections.Concurrent;

namespace BigBoss.API.Middlewares;

public class RateLimitingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RateLimitingMiddleware> _logger;
    private readonly int _maxRequestsPerMinute;
    private readonly int _maxAiRequestsPerMinute;
    private static readonly ConcurrentDictionary<string, RateLimitInfo> _requestCounts = new();

    public RateLimitingMiddleware(
        RequestDelegate next,
        ILogger<RateLimitingMiddleware> logger,
        IConfiguration configuration)
    {
        _next = next;
        _logger = logger;
        _maxRequestsPerMinute = int.Parse(configuration["BBF_MAX_REQUESTS_PER_MINUTE"] ?? "100");
        _maxAiRequestsPerMinute = int.Parse(configuration["BBF_MAX_AI_REQUESTS_PER_MINUTE"] ?? "10");
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var clientId = GetClientIdentifier(context);
        var isAiEndpoint = IsAiEndpoint(context.Request.Path);
        var maxRequests = isAiEndpoint ? _maxAiRequestsPerMinute : _maxRequestsPerMinute;
        var key = isAiEndpoint ? $"{clientId}_ai" : clientId;

        var rateLimitInfo = _requestCounts.GetOrAdd(key, _ => new RateLimitInfo());

        lock (rateLimitInfo)
        {
            // Reset if minute has passed
            if (DateTime.UtcNow - rateLimitInfo.WindowStart > TimeSpan.FromMinutes(1))
            {
                rateLimitInfo.RequestCount = 0;
                rateLimitInfo.WindowStart = DateTime.UtcNow;
            }

            rateLimitInfo.RequestCount++;

            if (rateLimitInfo.RequestCount > maxRequests)
            {
                _logger.LogWarning(
                    "Rate limit exceeded for {ClientId} on {Path}. Count: {Count}",
                    clientId, context.Request.Path, rateLimitInfo.RequestCount);

                context.Response.StatusCode = 429;
                context.Response.Headers.Append("Retry-After", "60");
                context.Response.ContentType = "application/json";

                var response = System.Text.Json.JsonSerializer.Serialize(new
                {
                    statusCode = 429,
                    message = "Trop de requetes. Reessayez dans une minute.",
                    retryAfter = 60
                });

                context.Response.WriteAsync(response).Wait();
                return;
            }
        }

        // Add rate limit headers
        context.Response.Headers.Append("X-RateLimit-Limit", maxRequests.ToString());
        context.Response.Headers.Append("X-RateLimit-Remaining", Math.Max(0, maxRequests - rateLimitInfo.RequestCount).ToString());

        await _next(context);
    }

    private string GetClientIdentifier(HttpContext context)
    {
        // Try to get user ID from JWT
        var userId = context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (!string.IsNullOrEmpty(userId))
        {
            return userId;
        }

        // Fall back to IP address
        var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

        // Check for forwarded headers (behind proxy)
        if (context.Request.Headers.TryGetValue("X-Forwarded-For", out var forwardedFor))
        {
            ip = forwardedFor.ToString().Split(',')[0].Trim();
        }

        return ip;
    }

    private bool IsAiEndpoint(PathString path)
    {
        var aiPaths = new[]
        {
            "/api/coach",
            "/api/sessions/generate",
            "/api/nutrition/scan"
        };

        return aiPaths.Any(p => path.StartsWithSegments(p, StringComparison.OrdinalIgnoreCase));
    }

    private class RateLimitInfo
    {
        public int RequestCount { get; set; }
        public DateTime WindowStart { get; set; } = DateTime.UtcNow;
    }
}
