namespace BigBoss.API.Middlewares;

/// <summary>
/// Sprint 6.3 — Middleware OWASP security headers.
///
/// Ajoute des headers de sécurité standards sur TOUTES les réponses HTTP :
/// - Strict-Transport-Security (HSTS) : force HTTPS pendant 1 an
/// - X-Content-Type-Options : empêche MIME-sniffing
/// - X-Frame-Options : protège contre clickjacking
/// - Referrer-Policy : limite la fuite d'URLs entre sites
/// - Permissions-Policy : restreint les API browser sensibles
/// - Content-Security-Policy : whitelist sources de scripts/iframes
///
/// Doc: https://owasp.org/www-project-secure-headers/
/// </summary>
public class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<SecurityHeadersMiddleware> _logger;

    public SecurityHeadersMiddleware(RequestDelegate next, ILogger<SecurityHeadersMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var headers = context.Response.Headers;

        // 1. HSTS — force HTTPS 1 an + includeSubDomains
        if (!headers.ContainsKey("Strict-Transport-Security"))
            headers.Append("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

        // 2. X-Content-Type-Options — empêche le browser de deviner les MIME types
        if (!headers.ContainsKey("X-Content-Type-Options"))
            headers.Append("X-Content-Type-Options", "nosniff");

        // 3. X-Frame-Options — bloque l'embed en iframe (sauf /hangfire dashboard interne)
        if (!headers.ContainsKey("X-Frame-Options")
            && !context.Request.Path.StartsWithSegments("/hangfire"))
            headers.Append("X-Frame-Options", "DENY");

        // 4. Referrer-Policy — empêche d'envoyer Referer aux sites tiers
        if (!headers.ContainsKey("Referrer-Policy"))
            headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");

        // 5. Permissions-Policy — désactive les API browser non utilisées
        if (!headers.ContainsKey("Permissions-Policy"))
            headers.Append("Permissions-Policy",
                "geolocation=(), microphone=(), camera=(self), payment=(self), usb=()");

        // 6. CSP — uniquement sur les routes /api (pas pour Hangfire qui a besoin de inline)
        if (!headers.ContainsKey("Content-Security-Policy")
            && context.Request.Path.StartsWithSegments("/api"))
        {
            headers.Append("Content-Security-Policy",
                "default-src 'none'; " +
                "frame-ancestors 'none'; " +
                "base-uri 'none'; " +
                "form-action 'none'");
        }

        // 7. X-XSS-Protection (legacy mais inclus par habitude)
        if (!headers.ContainsKey("X-XSS-Protection"))
            headers.Append("X-XSS-Protection", "0"); // 0 recommended modern (CSP fait mieux)

        await _next(context);
    }
}
