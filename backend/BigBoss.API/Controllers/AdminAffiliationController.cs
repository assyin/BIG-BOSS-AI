using BigBoss.Core.Entities;
using BigBoss.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BigBoss.API.Controllers;

[ApiController]
[Route("api/admin/affiliation")]
[Authorize(Roles = "Admin")]
public class AdminAffiliationController : ControllerBase
{
    private readonly BigBossDbContext _context;

    public AdminAffiliationController(BigBossDbContext context) => _context = context;

    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview()
    {
        var totalReferrals = await _context.AffiliationEvents
            .Where(e => e.EventType == AffiliationEventType.Registration).CountAsync();
        var thisMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var monthlyReferrals = await _context.AffiliationEvents
            .Where(e => e.EventType == AffiliationEventType.Registration && e.CreatedAt >= thisMonth).CountAsync();
        var totalPointsAwarded = await _context.AffiliationEvents.SumAsync(e => e.PointsAwarded);
        var suspiciousCount = await _context.AffiliationEvents.Where(e => e.IsSuspicious).CountAsync();

        var topReferrers = await _context.AffiliationEvents
            .Where(e => e.EventType == AffiliationEventType.Registration)
            .GroupBy(e => e.ReferrerId)
            .Select(g => new { UserId = g.Key, Count = g.Count(), Points = g.Sum(e => e.PointsAwarded) })
            .OrderByDescending(g => g.Count)
            .Take(10)
            .ToListAsync();

        var referrerIds = topReferrers.Select(r => r.UserId).ToList();
        var users = await _context.Users.AsNoTracking()
            .Where(u => referrerIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.Name);

        return Ok(new
        {
            totalReferrals,
            monthlyReferrals,
            totalPointsAwarded,
            suspiciousCount,
            topReferrers = topReferrers.Select(r => new
            {
                r.UserId,
                name = users.GetValueOrDefault(r.UserId, "?"),
                r.Count,
                r.Points
            })
        });
    }

    [HttpGet("suspicious")]
    public async Task<IActionResult> GetSuspicious()
    {
        var suspicious = await _context.AffiliationEvents.AsNoTracking()
            .Where(e => e.IsSuspicious)
            .Include(e => e.Referrer)
            .Include(e => e.Referee)
            .OrderByDescending(e => e.CreatedAt)
            .Take(50)
            .ToListAsync();

        return Ok(suspicious.Select(e => new
        {
            e.Id,
            referrerName = e.Referrer?.Name,
            refereeName = e.Referee?.Name,
            e.ReferralCode,
            e.IpAddress,
            e.CreatedAt,
        }));
    }

    [HttpGet("withdrawals")]
    public async Task<IActionResult> GetWithdrawals([FromQuery] WithdrawalStatus? status = null)
    {
        var query = _context.WithdrawalRequests.AsNoTracking().Include(w => w.User).AsQueryable();
        if (status.HasValue) query = query.Where(w => w.Status == status.Value);
        return Ok(await query.OrderByDescending(w => w.CreatedAt).ToListAsync());
    }

    [HttpPut("withdrawals/{id}/approve")]
    public async Task<IActionResult> ApproveWithdrawal(Guid id)
    {
        var w = await _context.WithdrawalRequests.FindAsync(id);
        if (w == null) return NotFound();
        w.Status = WithdrawalStatus.Completed;
        w.ProcessedAt = DateTime.UtcNow;
        w.ProcessedByAdminId = GetAdminId();
        await _context.SaveChangesAsync();
        return Ok(new { message = "Retrait approuve" });
    }

    [HttpPut("withdrawals/{id}/reject")]
    public async Task<IActionResult> RejectWithdrawal(Guid id, [FromBody] RejectRequest request)
    {
        var w = await _context.WithdrawalRequests.FindAsync(id);
        if (w == null) return NotFound();
        w.Status = WithdrawalStatus.Rejected;
        w.RejectReason = request.Reason;
        w.ProcessedAt = DateTime.UtcNow;
        w.ProcessedByAdminId = GetAdminId();
        await _context.SaveChangesAsync();
        return Ok(new { message = "Retrait rejete" });
    }

    private Guid GetAdminId()
    {
        var claim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        return claim != null && Guid.TryParse(claim.Value, out var id) ? id : Guid.Empty;
    }
}

public class RejectRequest { public string Reason { get; set; } = string.Empty; }
