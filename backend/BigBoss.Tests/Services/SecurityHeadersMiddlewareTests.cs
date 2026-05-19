using BigBoss.API.Middlewares;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace BigBoss.Tests.Services;

/// <summary>
/// Sprint 6.3 — Tests pour SecurityHeadersMiddleware (OWASP).
/// </summary>
public class SecurityHeadersMiddlewareTests
{
    private SecurityHeadersMiddleware BuildMiddleware(RequestDelegate next)
    {
        var logger = new Mock<ILogger<SecurityHeadersMiddleware>>();
        return new SecurityHeadersMiddleware(next, logger.Object);
    }

    private DefaultHttpContext CreateContext(string path = "/api/test")
    {
        var ctx = new DefaultHttpContext();
        ctx.Request.Path = path;
        return ctx;
    }

    [Fact]
    public async Task Middleware_AddsAllSecurityHeaders_ForApiRoutes()
    {
        var ctx = CreateContext("/api/exercises");
        var middleware = BuildMiddleware(_ => Task.CompletedTask);

        await middleware.InvokeAsync(ctx);

        var headers = ctx.Response.Headers;
        headers.Should().ContainKey("Strict-Transport-Security");
        headers["Strict-Transport-Security"].ToString().Should().Contain("max-age=31536000");
        headers.Should().ContainKey("X-Content-Type-Options");
        headers["X-Content-Type-Options"].ToString().Should().Be("nosniff");
        headers.Should().ContainKey("X-Frame-Options");
        headers["X-Frame-Options"].ToString().Should().Be("DENY");
        headers.Should().ContainKey("Referrer-Policy");
        headers.Should().ContainKey("Permissions-Policy");
        headers.Should().ContainKey("Content-Security-Policy");
    }

    [Fact]
    public async Task Middleware_HangfireRoute_DoesNotAddXFrameOptions()
    {
        var ctx = CreateContext("/hangfire/recurring");
        var middleware = BuildMiddleware(_ => Task.CompletedTask);

        await middleware.InvokeAsync(ctx);

        // Hangfire dashboard a besoin de pouvoir s'afficher dans son contexte iframe interne
        ctx.Response.Headers.ContainsKey("X-Frame-Options").Should().BeFalse();
        // Les autres headers restent
        ctx.Response.Headers.Should().ContainKey("Strict-Transport-Security");
    }

    [Fact]
    public async Task Middleware_NonApiRoute_DoesNotAddCSP()
    {
        var ctx = CreateContext("/health");
        var middleware = BuildMiddleware(_ => Task.CompletedTask);

        await middleware.InvokeAsync(ctx);

        ctx.Response.Headers.ContainsKey("Content-Security-Policy").Should().BeFalse();
    }
}
