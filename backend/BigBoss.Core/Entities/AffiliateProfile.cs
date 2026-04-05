namespace BigBoss.Core.Entities;

public class AffiliateProfile
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public AffiliateLevel Level { get; set; } = AffiliateLevel.Bronze;
    public int TotalReferrals { get; set; }
    public int ActiveReferrals { get; set; }
    public decimal TotalEarnings { get; set; } // MAD
    public decimal PendingEarnings { get; set; }
    public decimal AvailableForWithdrawal { get; set; }
    public decimal CommissionPercent { get; set; } = 10;
    public string? BankName { get; set; }
    public string? BankAccount { get; set; } // encrypted
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public virtual User User { get; set; } = null!;
    public virtual ICollection<WithdrawalRequest> WithdrawalRequests { get; set; } = new List<WithdrawalRequest>();
}

public class WithdrawalRequest
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public decimal Amount { get; set; }
    public string Method { get; set; } = "bank_transfer";
    public string? BankAccount { get; set; }
    public WithdrawalStatus Status { get; set; } = WithdrawalStatus.Pending;
    public string? AdminNotes { get; set; }
    public string? RejectReason { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ProcessedAt { get; set; }
    public Guid? ProcessedByAdminId { get; set; }

    public virtual User User { get; set; } = null!;
}

public enum AffiliateLevel
{
    Bronze = 1,
    Silver = 2,
    Gold = 3,
    Ambassador = 4,
}

public enum WithdrawalStatus
{
    Pending = 1,
    Processing = 2,
    Completed = 3,
    Rejected = 4,
}
