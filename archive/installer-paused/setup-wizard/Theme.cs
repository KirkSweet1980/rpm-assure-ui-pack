using System;
using System.Drawing;

namespace RpmAssure.Setup;

/// <summary>Installer UI themes — brand-aligned tokens.</summary>
public sealed class InstallerTheme
{
    public string Id { get; init; } = "";
    public string DisplayName { get; init; } = "";
    public string Description { get; init; } = "";

    public Color Bg { get; init; }
    public Color Sidebar { get; init; }
    public Color SidebarAccent { get; init; }
    public Color Content { get; init; }
    public Color Footer { get; init; }
    public Color Card { get; init; }
    public Color Border { get; init; }
    public Color Text { get; init; }
    public Color Muted { get; init; }
    public Color Primary { get; init; }
    public Color PrimaryHover { get; init; }
    public Color PrimaryText { get; init; }
    public Color Danger { get; init; }
    public Color Success { get; init; }
    public Color InputBg { get; init; }
    public Color InputText { get; init; }
    public Color StepActive { get; init; }
    public Color StepDone { get; init; }
    public Color StepIdle { get; init; }
    public Color Rail { get; init; }
    public Color HeroGlow { get; init; }

    public static InstallerTheme MidnightTeal { get; } = new()
    {
        Id = "midnight-teal",
        DisplayName = "Midnight Teal",
        Description = "Default — dark estate dashboard, RPM Assure brand",
        Bg = Color.FromArgb(11, 16, 24),
        Sidebar = Color.FromArgb(16, 24, 36),
        SidebarAccent = Color.FromArgb(12, 90, 80),
        Content = Color.FromArgb(14, 20, 30),
        Footer = Color.FromArgb(16, 24, 36),
        Card = Color.FromArgb(24, 34, 48),
        Border = Color.FromArgb(42, 58, 78),
        Text = Color.FromArgb(232, 238, 244),
        Muted = Color.FromArgb(140, 156, 174),
        Primary = Color.FromArgb(14, 140, 120),
        PrimaryHover = Color.FromArgb(18, 168, 144),
        PrimaryText = Color.White,
        Danger = Color.FromArgb(220, 90, 90),
        Success = Color.FromArgb(46, 180, 140),
        InputBg = Color.FromArgb(20, 28, 40),
        InputText = Color.FromArgb(236, 242, 248),
        StepActive = Color.FromArgb(14, 140, 120),
        StepDone = Color.FromArgb(80, 170, 150),
        StepIdle = Color.FromArgb(90, 108, 128),
        Rail = Color.FromArgb(36, 50, 68),
        HeroGlow = Color.FromArgb(14, 140, 120),
    };

    public static InstallerTheme Graphite { get; } = new()
    {
        Id = "graphite",
        DisplayName = "Graphite Ops",
        Description = "Neutral charcoal — low-chrome NOC aesthetic",
        Bg = Color.FromArgb(28, 28, 32),
        Sidebar = Color.FromArgb(22, 22, 26),
        SidebarAccent = Color.FromArgb(90, 200, 180),
        Content = Color.FromArgb(32, 32, 36),
        Footer = Color.FromArgb(22, 22, 26),
        Card = Color.FromArgb(40, 40, 46),
        Border = Color.FromArgb(64, 64, 72),
        Text = Color.FromArgb(240, 240, 244),
        Muted = Color.FromArgb(150, 150, 160),
        Primary = Color.FromArgb(90, 200, 180),
        PrimaryHover = Color.FromArgb(110, 220, 200),
        PrimaryText = Color.FromArgb(12, 20, 18),
        Danger = Color.FromArgb(230, 100, 100),
        Success = Color.FromArgb(90, 200, 180),
        InputBg = Color.FromArgb(24, 24, 28),
        InputText = Color.FromArgb(240, 240, 244),
        StepActive = Color.FromArgb(90, 200, 180),
        StepDone = Color.FromArgb(70, 170, 155),
        StepIdle = Color.FromArgb(110, 110, 120),
        Rail = Color.FromArgb(50, 50, 58),
        HeroGlow = Color.FromArgb(90, 200, 180),
    };

    public static InstallerTheme SlateLight { get; } = new()
    {
        Id = "slate-light",
        DisplayName = "Slate Light",
        Description = "Bright ops console — high ambient light rooms",
        Bg = Color.FromArgb(244, 246, 249),
        Sidebar = Color.FromArgb(255, 255, 255),
        SidebarAccent = Color.FromArgb(10, 107, 95),
        Content = Color.FromArgb(248, 250, 252),
        Footer = Color.FromArgb(255, 255, 255),
        Card = Color.FromArgb(255, 255, 255),
        Border = Color.FromArgb(210, 218, 228),
        Text = Color.FromArgb(22, 30, 42),
        Muted = Color.FromArgb(90, 104, 122),
        Primary = Color.FromArgb(10, 107, 95),
        PrimaryHover = Color.FromArgb(12, 130, 115),
        PrimaryText = Color.White,
        Danger = Color.FromArgb(180, 50, 50),
        Success = Color.FromArgb(16, 130, 100),
        InputBg = Color.FromArgb(255, 255, 255),
        InputText = Color.FromArgb(22, 30, 42),
        StepActive = Color.FromArgb(10, 107, 95),
        StepDone = Color.FromArgb(40, 140, 120),
        StepIdle = Color.FromArgb(140, 150, 165),
        Rail = Color.FromArgb(220, 228, 236),
        HeroGlow = Color.FromArgb(10, 107, 95),
    };

    public static InstallerTheme HighContrast { get; } = new()
    {
        Id = "high-contrast",
        DisplayName = "High Contrast",
        Description = "Max readability — black / white / amber accent",
        Bg = Color.Black,
        Sidebar = Color.FromArgb(12, 12, 12),
        SidebarAccent = Color.FromArgb(255, 190, 40),
        Content = Color.Black,
        Footer = Color.FromArgb(12, 12, 12),
        Card = Color.FromArgb(20, 20, 20),
        Border = Color.FromArgb(220, 220, 220),
        Text = Color.White,
        Muted = Color.FromArgb(200, 200, 200),
        Primary = Color.FromArgb(255, 190, 40),
        PrimaryHover = Color.FromArgb(255, 210, 90),
        PrimaryText = Color.Black,
        Danger = Color.FromArgb(255, 80, 80),
        Success = Color.FromArgb(80, 255, 140),
        InputBg = Color.Black,
        InputText = Color.White,
        StepActive = Color.FromArgb(255, 190, 40),
        StepDone = Color.FromArgb(80, 255, 140),
        StepIdle = Color.FromArgb(160, 160, 160),
        Rail = Color.FromArgb(80, 80, 80),
        HeroGlow = Color.FromArgb(255, 190, 40),
    };

    public static InstallerTheme[] All { get; } =
    {
        MidnightTeal,
        Graphite,
        SlateLight,
        HighContrast,
    };

    public static InstallerTheme FromId(string? id)
    {
        if (string.IsNullOrWhiteSpace(id)) return MidnightTeal;
        foreach (var t in All)
            if (string.Equals(t.Id, id, StringComparison.OrdinalIgnoreCase))
                return t;
        return MidnightTeal;
    }
}
