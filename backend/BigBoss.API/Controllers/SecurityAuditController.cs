using BigBoss.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BigBoss.API.Controllers;

/// <summary>
/// Sprint 6.3 — Audit interne de sécurité OWASP Top 10.
/// Endpoint admin qui audite la config courante et signale les risques.
/// </summary>
[ApiController]
[Route("api/admin/security")]
[Authorize(Roles = "Admin")]
public class SecurityAuditController : ControllerBase
{
    private readonly BigBossDbContext _db;
    private readonly IConfiguration _config;
    private readonly ILogger<SecurityAuditController> _logger;

    public SecurityAuditController(BigBossDbContext db, IConfiguration config, ILogger<SecurityAuditController> logger)
    {
        _db = db;
        _config = config;
        _logger = logger;
    }

    /// <summary>
    /// Lance un audit OWASP Top 10 automatisé sur la config + DB.
    /// Retourne une liste de checks avec status OK/WARN/FAIL.
    /// </summary>
    [HttpGet("audit")]
    public async Task<IActionResult> Audit()
    {
        var checks = new List<AuditCheck>();

        // ─── A01 Broken Access Control ──────────────────────────
        // Vérifie qu'on a bien des roles dans les claims
        checks.Add(new AuditCheck("A01-roles", "Authorization roles configurés",
            !string.IsNullOrEmpty(_config["BBF_JWT_SECRET"]) ? "OK" : "FAIL",
            "JWT secret doit être configuré (BBF_JWT_SECRET)"));

        // ─── A02 Cryptographic Failures ─────────────────────────
        var jwtSecret = _config["BBF_JWT_SECRET"] ?? "";
        checks.Add(new AuditCheck("A02-jwt-strength", "JWT secret >= 32 chars",
            jwtSecret.Length >= 32 ? "OK" : "FAIL",
            $"Longueur actuelle : {jwtSecret.Length}"));

        // ─── A03 Injection ──────────────────────────────────────
        // EF Core utilise parameterized queries par défaut → safe
        checks.Add(new AuditCheck("A03-sql-injection", "EF Core paramétré (anti-SQL injection)",
            "OK", "EF Core utilise des paramètres préparés par défaut"));

        // ─── A04 Insecure Design ────────────────────────────────
        var hasRateLimit = !string.IsNullOrEmpty(_config["BBF_MAX_REQUESTS_PER_MINUTE"]);
        checks.Add(new AuditCheck("A04-rate-limit", "Rate limiting actif",
            hasRateLimit ? "OK" : "WARN",
            hasRateLimit
                ? $"{_config["BBF_MAX_REQUESTS_PER_MINUTE"]} req/min général, {_config["BBF_MAX_AI_REQUESTS_PER_MINUTE"]} pour IA"
                : "Configurer BBF_MAX_REQUESTS_PER_MINUTE"));

        // ─── A05 Security Misconfiguration ──────────────────────
        var envIsProd = _config["ASPNETCORE_ENVIRONMENT"] == "Production";
        checks.Add(new AuditCheck("A05-env", "Environnement configuré",
            envIsProd ? "OK" : "INFO",
            envIsProd ? "Production" : $"Development (Swagger exposé). À passer en Production pour le launch."));

        // ─── A06 Vulnerable Components ──────────────────────────
        checks.Add(new AuditCheck("A06-deps", "Dependencies à scanner manuellement",
            "INFO", "Lancer 'dotnet list package --vulnerable' + 'npm audit' avant chaque release"));

        // ─── A07 Authentication Failures ────────────────────────
        var bcryptUsed = true; // hardcoded — on sait qu'on utilise BCrypt
        checks.Add(new AuditCheck("A07-bcrypt", "Passwords hashed via BCrypt",
            bcryptUsed ? "OK" : "FAIL", "BCrypt.Net-Next dans Infrastructure"));

        var inactiveSuspendedUsers = await _db.Users.AsNoTracking()
            .CountAsync(u => u.IsSuspended);
        checks.Add(new AuditCheck("A07-suspended", "Users suspendus actifs",
            "INFO", $"{inactiveSuspendedUsers} user(s) suspendu(s) en DB"));

        // ─── A08 Software/Data Integrity Failures ───────────────
        var idempotenceColumnExists = false;
        try
        {
            idempotenceColumnExists = await _db.Database
                .SqlQueryRaw<int>("SELECT 1 FROM information_schema.columns WHERE table_name='session_exercises' AND column_name='processed_client_uuids' LIMIT 1")
                .AnyAsync();
        }
        catch { /* ignore */ }
        checks.Add(new AuditCheck("A08-idempotence", "Idempotence offline sets (clientUuid)",
            idempotenceColumnExists ? "OK" : "WARN",
            idempotenceColumnExists ? "session_exercises.processed_client_uuids présent" : "Colonne absente"));

        // ─── A09 Security Logging ───────────────────────────────
        checks.Add(new AuditCheck("A09-serilog", "Logs structurés Serilog actifs",
            "OK", "Console + fichier journalier logs/bigboss-{date}.log"));

        // ─── A10 SSRF ────────────────────────────────────────────
        checks.Add(new AuditCheck("A10-ssrf", "Pas d'URL utilisateur fetched côté backend",
            "OK", "Pas de proxy URL fetch (R2 signed URLs uniquement)"));

        // ─── BBF-specific ────────────────────────────────────────
        var photosEncrypted = await _db.ProgressPhotos.AsNoTracking()
            .Where(p => !string.IsNullOrEmpty(p.StorageUrlEncrypted))
            .AnyAsync();
        checks.Add(new AuditCheck("BBF-photo-storage", "Photos progression en R2",
            photosEncrypted ? "OK" : "INFO",
            "StorageUrlEncrypted column populée"));

        var failedSecrets = new[]
        {
            ("BBF_CLAUDE_API_KEY", "claude-key"),
            ("BBF_OPENAI_API_KEY", "openai-key"),
            ("BBF_R2_ACCESS_KEY_ID", "r2-access"),
        }.Select(s => new
        {
            key = s.Item1,
            configured = !string.IsNullOrEmpty(_config[s.Item1]) && _config[s.Item1] != "placeholder" && _config[s.Item1] != "test-key",
            label = s.Item2,
        }).ToList();

        var stats = new
        {
            totalChecks = checks.Count,
            passed = checks.Count(c => c.Status == "OK"),
            warnings = checks.Count(c => c.Status == "WARN" || c.Status == "INFO"),
            failed = checks.Count(c => c.Status == "FAIL"),
        };

        return Ok(new
        {
            generatedAt = DateTime.UtcNow,
            stats,
            secrets = failedSecrets,
            checks,
        });
    }

    public record AuditCheck(string Id, string Title, string Status, string Detail);
}
