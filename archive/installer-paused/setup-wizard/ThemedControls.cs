using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;

namespace RpmAssure.Setup;

/// <summary>Primary button with theme + hover.</summary>
public sealed class ThemeButton : Button
{
    InstallerTheme _theme = InstallerTheme.MidnightTeal;
    bool _primary;
    bool _hover;

    public ThemeButton()
    {
        FlatStyle = FlatStyle.Flat;
        FlatAppearance.BorderSize = 0;
        Cursor = Cursors.Hand;
        Height = 36;
        Font = new Font("Segoe UI Semibold", 9.5f);
        SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.UserPaint | ControlStyles.OptimizedDoubleBuffer, true);
    }

    public void Apply(InstallerTheme theme, bool primary)
    {
        _theme = theme;
        _primary = primary;
        Invalidate();
    }

    protected override void OnMouseEnter(EventArgs e) { _hover = true; Invalidate(); base.OnMouseEnter(e); }
    protected override void OnMouseLeave(EventArgs e) { _hover = false; Invalidate(); base.OnMouseLeave(e); }

    protected override void OnPaint(PaintEventArgs e)
    {
        var g = e.Graphics;
        g.SmoothingMode = SmoothingMode.AntiAlias;
        var rect = ClientRectangle;
        rect.Inflate(-1, -1);
        Color bg, fg, border;
        if (!Enabled)
        {
            bg = Color.FromArgb(80, _theme.Card);
            fg = _theme.Muted;
            border = _theme.Border;
        }
        else if (_primary)
        {
            bg = _hover ? _theme.PrimaryHover : _theme.Primary;
            fg = _theme.PrimaryText;
            border = bg;
        }
        else
        {
            bg = _hover ? _theme.Card : _theme.Footer;
            fg = _theme.Text;
            border = _theme.Border;
        }

        using var path = RoundRect(rect, 8);
        using (var b = new SolidBrush(bg)) g.FillPath(b, path);
        using (var p = new Pen(border)) g.DrawPath(p, path);
        TextRenderer.DrawText(g, Text, Font, rect, fg,
            TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter);
    }

    static GraphicsPath RoundRect(Rectangle r, int radius)
    {
        int d = radius * 2;
        var path = new GraphicsPath();
        path.AddArc(r.X, r.Y, d, d, 180, 90);
        path.AddArc(r.Right - d, r.Y, d, d, 270, 90);
        path.AddArc(r.Right - d, r.Bottom - d, d, d, 0, 90);
        path.AddArc(r.X, r.Bottom - d, d, d, 90, 90);
        path.CloseFigure();
        return path;
    }
}

/// <summary>Sidebar with step rail painted for current theme.</summary>
public sealed class StepSidebar : Panel
{
    InstallerTheme _theme = InstallerTheme.MidnightTeal;
    int _page;
    readonly string[] _steps = { "Welcome", "Theme", "License", "Location", "SQL Server", "Install", "Finish" };

    public StepSidebar()
    {
        DoubleBuffered = true;
        Width = 240;
        SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.UserPaint | ControlStyles.OptimizedDoubleBuffer, true);
    }

    public void Apply(InstallerTheme theme, int page)
    {
        _theme = theme;
        _page = page;
        Invalidate();
    }

    public int StepCount => _steps.Length;

    protected override void OnPaint(PaintEventArgs e)
    {
        var g = e.Graphics;
        g.SmoothingMode = SmoothingMode.AntiAlias;
        g.Clear(_theme.Sidebar);

        // left accent bar
        using (var b = new SolidBrush(_theme.SidebarAccent))
            g.FillRectangle(b, 0, 0, 4, Height);

        // brand
        using (var fBrand = new Font("Segoe UI Semibold", 15f))
        using (var b = new SolidBrush(_theme.Text))
            g.DrawString("RPM Assure", fBrand, b, 20, 22);

        using (var fTag = new Font("Segoe UI", 8.5f))
        using (var b = new SolidBrush(_theme.Primary))
            g.DrawString("Setup Wizard  ·  v1.0.1", fTag, b, 20, 50);

        // thin rule
        using (var p = new Pen(_theme.Border))
            g.DrawLine(p, 20, 78, Width - 20, 78);

        int top = 100;
        int railX = 28;
        using (var pen = new Pen(_theme.Rail, 2))
            g.DrawLine(pen, railX, top + 10, railX, top + (_steps.Length - 1) * 44 + 10);

        for (int i = 0; i < _steps.Length; i++)
        {
            int cy = top + i * 44 + 10;
            bool done = i < _page;
            bool active = i == _page;
            Color ring = active ? _theme.StepActive : (done ? _theme.StepDone : _theme.StepIdle);
            Color fill = active || done ? ring : _theme.Sidebar;

            using (var b = new SolidBrush(fill))
                g.FillEllipse(b, railX - 7, cy - 7, 14, 14);
            using (var p = new Pen(ring, 2))
                g.DrawEllipse(p, railX - 7, cy - 7, 14, 14);

            if (done && !active)
            {
                using var pf = new Pen(_theme.Sidebar, 2);
                g.DrawLines(pf, new[] {
                    new Point(railX - 3, cy),
                    new Point(railX - 1, cy + 3),
                    new Point(railX + 4, cy - 3)
                });
            }

            using var f = new Font("Segoe UI", 9.5f, active ? FontStyle.Bold : FontStyle.Regular);
            using var tb = new SolidBrush(active ? _theme.Text : (done ? _theme.Text : _theme.Muted));
            g.DrawString(_steps[i], f, tb, railX + 18, cy - 8);
        }

        // footer chip
        using (var f = new Font("Segoe UI", 7.5f))
        using (var b = new SolidBrush(_theme.Muted))
            g.DrawString("RPM Resources", f, b, 20, Height - 28);
    }
}

/// <summary>Theme picker card.</summary>
public sealed class ThemeCard : Panel
{
    public InstallerTheme Theme { get; }
    public bool Selected { get; set; }
    public event EventHandler? SelectedChanged;
    InstallerTheme _chrome;

    public ThemeCard(InstallerTheme theme, InstallerTheme chrome)
    {
        Theme = theme;
        _chrome = chrome;
        Height = 80;
        Cursor = Cursors.Hand;
        DoubleBuffered = true;
        SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.UserPaint | ControlStyles.OptimizedDoubleBuffer, true);
        Click += (_, _) => { Selected = true; SelectedChanged?.Invoke(this, EventArgs.Empty); };
    }

    public void SetChrome(InstallerTheme chrome)
    {
        _chrome = chrome;
        Invalidate();
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        var g = e.Graphics;
        g.SmoothingMode = SmoothingMode.AntiAlias;
        var r = ClientRectangle;
        r.Inflate(-1, -1);
        using var path = Round(r, 10);
        using (var b = new SolidBrush(_chrome.Card)) g.FillPath(b, path);
        using (var p = new Pen(Selected ? _chrome.Primary : _chrome.Border, Selected ? 2 : 1))
            g.DrawPath(p, path);

        // swatches
        int sx = 14;
        int sy = 18;
        DrawSwatch(g, Theme.Sidebar, sx, sy);
        DrawSwatch(g, Theme.Primary, sx + 22, sy);
        DrawSwatch(g, Theme.Card, sx + 44, sy);
        DrawSwatch(g, Theme.Text, sx + 66, sy);

        using var fTitle = new Font("Segoe UI Semibold", 10f);
        using var fDesc = new Font("Segoe UI", 8f);
        using var b1 = new SolidBrush(_chrome.Text);
        using var b2 = new SolidBrush(_chrome.Muted);
        g.DrawString(Theme.DisplayName, fTitle, b1, 100, 14);
        g.DrawString(Theme.Description, fDesc, b2, 100, 36);

        if (Selected)
        {
            using var fb = new SolidBrush(_chrome.Primary);
            g.FillEllipse(fb, Width - 28, Height / 2 - 7, 14, 14);
            using var pen = new Pen(_chrome.PrimaryText, 2);
            g.DrawLines(pen, new[] {
                new Point(Width - 24, Height / 2),
                new Point(Width - 21, Height / 2 + 3),
                new Point(Width - 16, Height / 2 - 3)
            });
        }
    }

    static void DrawSwatch(Graphics g, Color c, int x, int y)
    {
        using var b = new SolidBrush(c);
        g.FillEllipse(b, x, y, 16, 16);
        using var p = new Pen(Color.FromArgb(80, 0, 0, 0));
        g.DrawEllipse(p, x, y, 16, 16);
    }

    static GraphicsPath Round(Rectangle r, int radius)
    {
        int d = radius * 2;
        var path = new GraphicsPath();
        path.AddArc(r.X, r.Y, d, d, 180, 90);
        path.AddArc(r.Right - d, r.Y, d, d, 270, 90);
        path.AddArc(r.Right - d, r.Bottom - d, d, d, 0, 90);
        path.AddArc(r.X, r.Bottom - d, d, d, 90, 90);
        path.CloseFigure();
        return path;
    }
}
