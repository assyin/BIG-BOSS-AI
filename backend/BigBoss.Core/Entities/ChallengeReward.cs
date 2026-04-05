namespace BigBoss.Core.Entities;

public class ChallengeReward
{
    public Guid Id { get; set; }
    public Guid ChallengeId { get; set; }
    public int RankFrom { get; set; } // ex: 1
    public int RankTo { get; set; }   // ex: 3 (ranks 1-3 get this reward)
    public ChallengeRewardType RewardType { get; set; }
    public decimal RewardValue { get; set; } // amount in MAD, months, or points
    public string Description { get; set; } = string.Empty;
    public int BonusPoints { get; set; }

    public virtual Challenge Challenge { get; set; } = null!;
}

public enum ChallengeRewardType
{
    CashMAD = 1,
    PremiumMonth = 2,
    EliteMonth = 3,
    Product = 4,
    Coaching = 5,
    Points = 6,
}
