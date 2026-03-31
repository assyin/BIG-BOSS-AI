namespace BigBoss.Core.Enums;

[Flags]
public enum Equipment
{
    None = 0,
    Barbell = 1,
    Dumbbell = 2,
    Cable = 4,
    Machine = 8,
    Bodyweight = 16,
    TRX = 32,
    ResistanceBand = 64,
    Kettlebell = 128,
    PullUpBar = 256,
    Bench = 512,
    SquatRack = 1024
}
