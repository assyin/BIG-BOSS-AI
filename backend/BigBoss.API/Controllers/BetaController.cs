using System.Security.Claims;
using BigBoss.Core.Entities;
using BigBoss.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BigBoss.API.Controllers;

/// <summary>
/// Sprint 6.5 — Beta privée: signup public + admin gestion invitations.
/// </summary>
[ApiController]
[Route("api/beta")]
public class BetaController : ControllerBase
{
    private readonly BigBossDbContext _db;
    private readonly ILogger<BetaController> _logger;

    public BetaController(BigBossDbContext db, ILogger<BetaController> logger)
    {
        _db = db;
        _logger = logger;
    }

    public record SignupRequest(string Email, string? Name, string? Phone, string? City);

    /// <summary>
    /// Signup public à la beta privée (landing page). Pas d'auth requise.
    /// </summary>
    [HttpPost("signup")]
    [AllowAnonymous]
    public async Task<IActionResult> Signup([FromBody] SignupRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || !req.Email.Contains('@'))
            return BadRequest(new { error = "Email invalide" });

        var email = req.Email.Trim().ToLowerInvariant();

        // Check si déjà inscrit
        var existing = await _db.BetaInvitations.FirstOrDefaultAsync(b => b.Email == email);
        if (existing != null)
        {
            return Ok(new
            {
                alreadyRegistered = true,
                status = existing.Status,
                message = "Tu es déjà inscrit à la beta. On te contacte bientôt 💪",
            });
        }

        // Compter le nombre actuel d'inscrits pour info
        var totalSignups = await _db.BetaInvitations.CountAsync();

        var invitation = new BetaInvitation
        {
            Id = Guid.NewGuid(),
            Email = email,
            Name = req.Name?.Trim(),
            Phone = req.Phone?.Trim(),
            City = req.City?.Trim(),
            Source = "landing",
            Status = "Pending",
            CreatedAt = DateTime.UtcNow,
        };
        _db.BetaInvitations.Add(invitation);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Beta signup: {Email} (#{Position})", email, totalSignups + 1);

        return Ok(new
        {
            ok = true,
            position = totalSignups + 1,
            message = $"Bienvenue dans la beta Big Boss Fitness 🇲🇦 ! Tu es le n°{totalSignups + 1}",
        });
    }

    /// <summary>Stats publiques (compteur d'inscrits) pour la landing.</summary>
    [HttpGet("stats")]
    [AllowAnonymous]
    public async Task<IActionResult> Stats()
    {
        var total = await _db.BetaInvitations.CountAsync();
        var accepted = await _db.BetaInvitations.CountAsync(b => b.Status == "Accepted");
        return Ok(new { total, accepted, target = 500 });
    }

    // ─── Admin endpoints ────────────────────────────────────────

    [HttpGet("list")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> List([FromQuery] string? status = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        pageSize = Math.Min(200, pageSize);
        var query = _db.BetaInvitations.AsNoTracking().AsQueryable();
        if (!string.IsNullOrEmpty(status)) query = query.Where(b => b.Status == status);

        var total = await query.CountAsync();
        var rows = await query
            .OrderByDescending(b => b.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new { total, page, pageSize, invitations = rows });
    }

    public record UpdateStatusRequest(string Status, string? AdminNotes);

    [HttpPost("{id:guid}/update-status")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateStatusRequest req)
    {
        var inv = await _db.BetaInvitations.FirstOrDefaultAsync(b => b.Id == id);
        if (inv == null) return NotFound();

        inv.Status = req.Status;
        if (req.Status == "Invited" && !inv.InvitedAt.HasValue) inv.InvitedAt = DateTime.UtcNow;
        if (req.Status == "Accepted" && !inv.AcceptedAt.HasValue) inv.AcceptedAt = DateTime.UtcNow;
        if (!string.IsNullOrEmpty(req.AdminNotes)) inv.AdminNotes = req.AdminNotes;
        await _db.SaveChangesAsync();

        return Ok(new { updated = true, status = inv.Status });
    }

    /// <summary>Export CSV de toutes les invitations (pour mail batch externe).</summary>
    [HttpGet("export.csv")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ExportCsv()
    {
        var rows = await _db.BetaInvitations.AsNoTracking().OrderBy(b => b.CreatedAt).ToListAsync();
        var sb = new System.Text.StringBuilder();
        sb.AppendLine("Email,Name,Phone,City,Source,Status,CreatedAt");
        foreach (var b in rows)
        {
            var line = $"\"{b.Email}\",\"{b.Name ?? ""}\",\"{b.Phone ?? ""}\",\"{b.City ?? ""}\",\"{b.Source}\",\"{b.Status}\",\"{b.CreatedAt:yyyy-MM-dd}\"";
            sb.AppendLine(line);
        }
        return File(System.Text.Encoding.UTF8.GetBytes(sb.ToString()), "text/csv", "beta-invitations.csv");
    }
}
