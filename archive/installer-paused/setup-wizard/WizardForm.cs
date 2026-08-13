using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace RpmAssure.Setup;

public class WizardForm : Form
{
    InstallerTheme _theme = InstallerTheme.MidnightTeal;

    readonly StepSidebar _sidebar = new();
    readonly Panel _content = new();
    readonly Panel _footer = new();
    readonly Label _stepTitle = new();
    readonly Label _stepSub = new();
    readonly ThemeButton _btnBack = new();
    readonly ThemeButton _btnNext = new();
    readonly ThemeButton _btnCancel = new();

    readonly Panel[] _pages = new Panel[7];
    int _page;
    readonly List<ThemeCard> _themeCards = new();
    readonly List<ThemeButton> _btnExtras = new();
    readonly List<Control> _themedLabels = new();
    readonly List<TextBox> _inputs = new();
    readonly List<CheckBox> _checks = new();

    TextBox _txtDir = null!;
    TextBox _txtSqlServer = null!;
    TextBox _txtSqlDb = null!;
    TextBox _txtSqlUser = null!;
    TextBox _txtSqlPass = null!;
    TextBox _txtUrl = null!;
    CheckBox _chkTrust = null!;
    CheckBox _chkAgree = null!;
    Label _lblSqlStatus = null!;
    ProgressBar _progress = null!;
    Label _lblProgress = null!;
    TextBox _txtLog = null!;
    CheckBox _chkLaunch = null!;
    CheckBox _chkDesktop = null!;

    string InstallDir => _txtDir.Text.Trim();
    const string AppTitle = "RPM Assure";
    const string Version = "1.0.1";

    // Layout scale — sidebar/footer fixed; content flexes with window
    int _sidebarW = 260;
    const int FooterH = 80;
    const int MinClientW = 1024;
    const int MinClientH = 700;

    public WizardForm()
    {
        Text = "RPM Assure Setup";
        FormBorderStyle = FormBorderStyle.Sizable;
        MaximizeBox = true;
        MinimizeBox = true;
        StartPosition = FormStartPosition.CenterScreen;
        Font = new Font("Segoe UI", 10f);
        DoubleBuffered = true;
        MinimumSize = new Size(MinClientW + 16, MinClientH + 40);

        // Size to ~85% of working area (multi-monitor aware), clamp to min
        var wa = Screen.FromPoint(Cursor.Position).WorkingArea;
        int w = Math.Max(MinClientW, (int)(wa.Width * 0.85));
        int h = Math.Max(MinClientH, (int)(wa.Height * 0.85));
        // Cap at working area so it never starts off-screen
        w = Math.Min(w, wa.Width - 24);
        h = Math.Min(h, wa.Height - 24);
        ClientSize = new Size(w, h);
        // Prefer maximized on smaller laptop screens
        if (wa.Width <= 1366 || wa.Height <= 800)
            WindowState = FormWindowState.Maximized;

        try
        {
            var pref = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "RPM Assure", "setup-theme.txt");
            if (File.Exists(pref))
                _theme = InstallerTheme.FromId(File.ReadAllText(pref).Trim());
        }
        catch { /* ignore */ }

        BuildChrome();
        BuildPages();
        ApplyTheme();
        ShowPage(0);
    }

    void LayoutRegions()
    {
        // Explicit geometry — content never under sidebar; scales with resize / DPI
        int cw = Math.Max(MinClientW, ClientSize.Width);
        int ch = Math.Max(400, ClientSize.Height);

        // Sidebar grows slightly on wide screens, stays readable on narrow
        _sidebarW = cw >= 1600 ? 300 : (cw >= 1280 ? 280 : 260);

        int footerH = FooterH;
        _sidebar.SetBounds(0, 0, _sidebarW, ch - footerH);
        _footer.SetBounds(0, ch - footerH, cw, footerH);
        _content.SetBounds(_sidebarW, 0, Math.Max(400, cw - _sidebarW), ch - footerH);

        // Footer buttons — large touch targets, right-aligned with margin
        int btnH = 40;
        int btnY = (footerH - btnH) / 2;
        _btnCancel.SetBounds(_sidebarW + 24, btnY, 120, btnH);
        _btnNext.SetBounds(cw - 24 - 140, btnY, 140, btnH);
        _btnBack.SetBounds(cw - 24 - 140 - 16 - 120, btnY, 120, btnH);

        // Title band
        int pad = Math.Max(28, _content.Width / 40);
        _stepTitle.Font = new Font("Segoe UI Semibold", _content.Width >= 900 ? 22f : 18f);
        _stepTitle.SetBounds(pad, 24, Math.Max(240, _content.Width - pad * 2), 40);
        _stepSub.SetBounds(pad, 68, Math.Max(240, _content.Width - pad * 2), 28);

        // Pages under title — fill remaining content area
        int pageTop = 108;
        int pageH = Math.Max(240, _content.Height - pageTop - 16);
        int pageW = Math.Max(400, _content.Width - pad * 2);
        for (int i = 0; i < _pages.Length; i++)
        {
            if (_pages[i] != null)
                _pages[i].SetBounds(pad, pageTop, pageW, pageH);
        }

        // Scale in-page major controls to page width
        ScalePageChildren(pageW, pageH);
    }

    void ScalePageChildren(int pageW, int pageH)
    {
        if (_pages == null || _pages.Length == 0) return;
        for (int pi = 0; pi < _pages.Length; pi++)
        {
            var page = _pages[pi];
            if (page == null) continue;
            foreach (Control c in page.Controls)
            {
                if (c is ThemeCard card)
                {
                    card.Width = pageW;
                    card.Height = Math.Max(72, Math.Min(100, pageH / 6));
                }
                else if (c is ProgressBar pb)
                {
                    pb.Width = pageW;
                }
                else if (c is TextBox tb)
                {
                    if (tb.Multiline)
                    {
                        tb.Width = pageW;
                        if (_txtLog != null && ReferenceEquals(tb, _txtLog))
                            tb.Height = Math.Max(200, pageH - 100);
                        else if (pi == 2)
                            tb.Height = Math.Max(220, pageH - 70);
                    }
                    else if (_txtSqlServer != null && ReferenceEquals(tb, _txtSqlServer))
                        tb.Width = pageW;
                    else if (_txtUrl != null && ReferenceEquals(tb, _txtUrl))
                        tb.Width = pageW;
                    else if (_txtDir != null && ReferenceEquals(tb, _txtDir))
                        tb.Width = Math.Max(280, pageW - 130);
                }
                else if (c is Label lb && lb.Width > 200)
                {
                    lb.Width = pageW;
                }
            }

            if (pi == 1)
            {
                int y = 40;
                int gap = 12;
                foreach (Control c in page.Controls)
                {
                    if (c is ThemeCard card)
                    {
                        card.Top = y;
                        card.Left = 0;
                        card.Width = pageW;
                        y += card.Height + gap;
                    }
                }
            }

            if (pi == 2 && _chkAgree != null)
            {
                foreach (Control c in page.Controls)
                {
                    if (c is TextBox tb && tb.Multiline)
                        _chkAgree.Top = Math.Min(pageH - 28, tb.Bottom + 12);
                }
            }

            if (pi == 3 && _txtDir != null)
            {
                foreach (Control c in page.Controls)
                {
                    if (c is ThemeButton b && b.Text != null && b.Text.StartsWith("Browse", StringComparison.OrdinalIgnoreCase))
                    {
                        b.Left = _txtDir.Right + 12;
                        b.Top = _txtDir.Top - 2;
                        b.Width = 110;
                        b.Height = 34;
                    }
                }
            }

            if (pi == 4 && _txtSqlDb != null && _txtSqlUser != null)
            {
                int half = Math.Max(200, (pageW - 20) / 2);
                _txtSqlDb.Width = half;
                _txtSqlUser.Left = half + 20;
                _txtSqlUser.Width = half;
                if (_txtSqlPass != null) _txtSqlPass.Width = half;
                if (_chkTrust != null) _chkTrust.Left = half + 20;
            }
        }
    }

    void BuildChrome()
    {
        // NO Dock.Fill on content — LayoutRegions sets bounds
        _sidebar.Width = _sidebarW;
        Controls.Add(_sidebar);

        _footer.Height = FooterH;
        Controls.Add(_footer);

        Controls.Add(_content);

        _btnCancel.Text = "Cancel";
        _btnCancel.Click += (_, _) =>
        {
            if (MessageBox.Show(this, "Exit setup?", AppTitle,
                    MessageBoxButtons.YesNo, MessageBoxIcon.Question) == DialogResult.Yes)
                Close();
        };
        _footer.Controls.Add(_btnCancel);

        _btnBack.Text = "<  Back";
        _btnBack.Click += (_, _) => ShowPage(_page - 1);
        _footer.Controls.Add(_btnBack);

        _btnNext.Text = "Next  >";
        _btnNext.Click += async (_, _) => await OnNext();
        _footer.Controls.Add(_btnNext);

        _stepTitle.Font = new Font("Segoe UI Semibold", 18f);
        _stepTitle.AutoSize = false;
        _content.Controls.Add(_stepTitle);

        _stepSub.Font = new Font("Segoe UI", 9.5f);
        _stepSub.AutoSize = false;
        _content.Controls.Add(_stepSub);

        Resize += (_, _) => LayoutRegions();
        LayoutRegions();
    }

    void BuildPages()
    {
        for (int i = 0; i < 7; i++)
        {
            _pages[i] = new Panel { Visible = false };
            _content.Controls.Add(_pages[i]);
        }
        LayoutRegions();

        // 0 Welcome
        _pages[0].Controls.Add(MakeBody(
            "Welcome to the RPM Assure Setup Wizard.\n\n" +
            "This wizard installs the estate assurance platform on this Windows server:\n\n" +
            "    ·  Application host (port 8081)\n" +
            "    ·  SQL Server connection for RPMAssure_App\n" +
            "    ·  Configuration under ProgramData\n\n" +
            "Choose a visual theme on the next page, then continue.",
            0, 8, 640, 280));

        // 1 Theme
        _pages[1].Controls.Add(MakeBody(
            "Pick an installer look. This only affects Setup — not the web application.",
            0, 0, 640, 28));
        int ty = 40;
        foreach (var th in InstallerTheme.All)
        {
            var card = new ThemeCard(th, _theme)
            {
                Left = 0,
                Top = ty,
                Width = 640,
                Height = 76,
                Selected = th.Id == _theme.Id
            };
            card.SelectedChanged += (_, _) =>
            {
                foreach (var c in _themeCards) c.Selected = ReferenceEquals(c, card);
                _theme = card.Theme;
                try
                {
                    var dir = Path.Combine(
                        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                        "RPM Assure");
                    Directory.CreateDirectory(dir);
                    File.WriteAllText(Path.Combine(dir, "setup-theme.txt"), _theme.Id);
                }
                catch { /* ignore */ }
                ApplyTheme();
                foreach (var c in _themeCards) { c.SetChrome(_theme); c.Invalidate(); }
            };
            _themeCards.Add(card);
            _pages[1].Controls.Add(card);
            ty += 84;
        }

        // 2 License
        var lic = new TextBox
        {
            Multiline = true,
            ReadOnly = true,
            ScrollBars = ScrollBars.Vertical,
            Left = 0,
            Top = 0,
            Width = 640,
            Height = 300,
            BorderStyle = BorderStyle.FixedSingle,
            Font = new Font("Consolas", 9f),
            Text =
                "RPM ASSURE  -  END USER LICENSE / USE TERMS\r\n\r\n" +
                "Copyright (c) RPM Resources.\r\n\r\n" +
                "Licensed for use by RPM Resources and authorised customers for managed\r\n" +
                "estate assurance, monitoring, and reporting.\r\n\r\n" +
                "You may install this product on servers you operate for that purpose.\r\n" +
                "Redistribution outside authorised channels is not permitted without\r\n" +
                "written consent.\r\n\r\n" +
                "THE SOFTWARE IS PROVIDED AS-IS WITHOUT WARRANTY OF ANY KIND.\r\n\r\n" +
                "By clicking I Agree you accept these terms."
        };
        _inputs.Add(lic);
        _pages[2].Controls.Add(lic);
        _chkAgree = new CheckBox
        {
            Text = "I accept the license terms",
            Left = 0,
            Top = 316,
            AutoSize = true
        };
        _checks.Add(_chkAgree);
        _pages[2].Controls.Add(_chkAgree);

        // 3 Location
        _pages[3].Controls.Add(MakeLabel("Install folder", 0, 8));
        _txtDir = MakeInput(@"C:\Program Files\RPM Resources\RPM Assure", 0, 32, 520);
        _pages[3].Controls.Add(_txtDir);
        var browse = new ThemeButton { Text = "Browse…", Left = 532, Top = 30, Width = 100 };
        browse.Click += (_, _) =>
        {
            using var fbd = new FolderBrowserDialog { SelectedPath = _txtDir.Text };
            if (fbd.ShowDialog(this) == DialogResult.OK) _txtDir.Text = fbd.SelectedPath;
        };
        _pages[3].Controls.Add(browse);
        _btnExtras.Add(browse);

        _chkDesktop = new CheckBox
        {
            Text = "Create desktop shortcut to login",
            Left = 0,
            Top = 80,
            Checked = true,
            AutoSize = true
        };
        _checks.Add(_chkDesktop);
        _pages[3].Controls.Add(_chkDesktop);
        _pages[3].Controls.Add(MakeBody(
            "Configuration and logs are stored under:\r\n" +
            @"  C:\ProgramData\RPM Resources\RPM Assure\",
            0, 120, 640, 60));

        // 4 SQL
        int y = 0;
        _pages[4].Controls.Add(MakeLabel("SQL Server (host,port or instance)", 0, y)); y += 22;
        _txtSqlServer = MakeInput("102.222.21.220,14333", 0, y, 640); y += 44;
        _pages[4].Controls.Add(_txtSqlServer);
        _pages[4].Controls.Add(MakeLabel("Database", 0, y));
        _pages[4].Controls.Add(MakeLabel("User", 330, y)); y += 22;
        _txtSqlDb = MakeInput("RPMAssure_App", 0, y, 310);
        _txtSqlUser = MakeInput("Rpm_collect", 330, y, 310); y += 44;
        _pages[4].Controls.Add(_txtSqlDb);
        _pages[4].Controls.Add(_txtSqlUser);
        _pages[4].Controls.Add(MakeLabel("Password", 0, y)); y += 22;
        _txtSqlPass = MakeInput("", 0, y, 310);
        _txtSqlPass.UseSystemPasswordChar = true;
        _pages[4].Controls.Add(_txtSqlPass);
        _chkTrust = new CheckBox
        {
            Text = "Trust server certificate",
            Left = 330,
            Top = y + 4,
            Checked = true,
            AutoSize = true
        };
        _checks.Add(_chkTrust);
        _pages[4].Controls.Add(_chkTrust);
        y += 44;
        _pages[4].Controls.Add(MakeLabel("Public site URL", 0, y)); y += 22;
        _txtUrl = MakeInput("https://assure.rpmresources.co.za", 0, y, 640); y += 44;
        _pages[4].Controls.Add(_txtUrl);

        var test = new ThemeButton { Text = "Test connection", Left = 0, Top = y, Width = 150 };
        test.Click += (_, _) => TestSql();
        _pages[4].Controls.Add(test);
        _btnExtras.Add(test);
        _lblSqlStatus = new Label
        {
            Left = 165,
            Top = y + 8,
            Width = 460,
            Height = 24,
            Text = "Optional — you can configure SQL later."
        };
        _themedLabels.Add(_lblSqlStatus);
        _pages[4].Controls.Add(_lblSqlStatus);

        // 5 Install
        _progress = new ProgressBar
        {
            Left = 0,
            Top = 12,
            Width = 640,
            Height = 24,
            Style = ProgressBarStyle.Continuous,
            Maximum = 100
        };
        _pages[5].Controls.Add(_progress);
        _lblProgress = new Label { Left = 0, Top = 48, Width = 640, Height = 24, Text = "Ready." };
        _themedLabels.Add(_lblProgress);
        _pages[5].Controls.Add(_lblProgress);
        _txtLog = new TextBox
        {
            Left = 0,
            Top = 84,
            Width = 640,
            Height = 280,
            Multiline = true,
            ReadOnly = true,
            ScrollBars = ScrollBars.Vertical,
            Font = new Font("Consolas", 8.5f),
            BorderStyle = BorderStyle.FixedSingle
        };
        _inputs.Add(_txtLog);
        _pages[5].Controls.Add(_txtLog);

        // 6 Finish
        _pages[6].Controls.Add(MakeBody(
            "Setup finished installing RPM Assure.\n\n" +
            "Next steps:\n" +
            "  1. Ensure Caddy (or reverse proxy) points to port 8081\n" +
            "  2. Open the public URL or http://127.0.0.1:8081/login\n" +
            "  3. Sign in with your provisioned admin account\n",
            0, 8, 640, 180));
        _chkLaunch = new CheckBox
        {
            Text = "Open RPM Assure login page",
            Left = 0,
            Top = 200,
            Checked = true,
            AutoSize = true
        };
        _checks.Add(_chkLaunch);
        _pages[6].Controls.Add(_chkLaunch);

        // Resize child controls when page size changes
        foreach (var page in _pages)
        {
            page.Resize += (_, _) =>
            {
                int w = Math.Max(400, page.ClientSize.Width);
                foreach (Control c in page.Controls)
                {
                    if (c is TextBox tb && tb.Multiline) { tb.Width = w; }
                    else if (c is ThemeCard card) { card.Width = w; }
                    else if (c is ProgressBar pb) { pb.Width = w; }
                    else if (c is TextBox tb2 && tb2 != _txtSqlDb && tb2 != _txtSqlUser && tb2 != _txtSqlPass
                             && (tb2 == _txtSqlServer || tb2 == _txtUrl || tb2 == _txtDir || tb2 == _txtLog))
                    {
                        if (tb2 == _txtDir) tb2.Width = Math.Max(200, w - 120);
                        else tb2.Width = w;
                    }
                }
            };
        }
    }

    Label MakeLabel(string t, int x, int y)
    {
        var lb = new Label { Text = t, Left = x, Top = y, AutoSize = true };
        _themedLabels.Add(lb);
        return lb;
    }

    Label MakeBody(string t, int x, int y, int w, int h)
    {
        var lb = new Label
        {
            Text = t,
            Left = x,
            Top = y,
            Width = w,
            Height = h,
            Font = new Font("Segoe UI", 10.5f)
        };
        _themedLabels.Add(lb);
        return lb;
    }

    TextBox MakeInput(string value, int x, int y, int w)
    {
        var tb = new TextBox
        {
            Text = value,
            Left = x,
            Top = y,
            Width = w,
            Height = 30,
            BorderStyle = BorderStyle.FixedSingle
        };
        _inputs.Add(tb);
        return tb;
    }

    void ApplyTheme()
    {
        BackColor = _theme.Bg;
        _content.BackColor = _theme.Content;
        _footer.BackColor = _theme.Footer;
        _sidebar.Apply(_theme, _page);
        _stepTitle.ForeColor = _theme.Text;
        _stepTitle.BackColor = _theme.Content;
        _stepSub.ForeColor = _theme.Muted;
        _stepSub.BackColor = _theme.Content;

        foreach (var p in _pages) p.BackColor = _theme.Content;
        foreach (var lb in _themedLabels)
        {
            if (lb == _lblSqlStatus && _lblSqlStatus.Text.StartsWith("TCP OK"))
                lb.ForeColor = _theme.Success;
            else if (lb == _lblSqlStatus && (_lblSqlStatus.Text.StartsWith("Cannot") || _lblSqlStatus.Text.StartsWith("Test failed")))
                lb.ForeColor = _theme.Danger;
            else if (lb == _lblProgress)
                lb.ForeColor = _theme.Text;
            else if (lb.Font.Size <= 9.5f && lb.Text.Length < 48 && !lb.Text.Contains('\n'))
                lb.ForeColor = _theme.Muted;
            else
                lb.ForeColor = _theme.Text;
            lb.BackColor = _theme.Content;
        }
        foreach (var tb in _inputs)
        {
            tb.BackColor = _theme.InputBg;
            tb.ForeColor = _theme.InputText;
        }
        foreach (var c in _checks)
        {
            c.ForeColor = _theme.Text;
            c.BackColor = _theme.Content;
        }
        _btnNext.Apply(_theme, primary: true);
        _btnBack.Apply(_theme, primary: false);
        _btnCancel.Apply(_theme, primary: false);
        foreach (var b in _btnExtras) b.Apply(_theme, primary: false);
        foreach (var c in _themeCards) { c.SetChrome(_theme); c.Invalidate(); }
        LayoutRegions();
        Invalidate(true);
    }

    void ShowPage(int i)
    {
        if (i < 0 || i > 6) return;
        _page = i;
        for (int p = 0; p < 7; p++) _pages[p].Visible = p == i;
        _sidebar.Apply(_theme, _page);
        LayoutRegions();

        _stepTitle.Text = i switch
        {
            0 => "Welcome",
            1 => "Installer theme",
            2 => "License agreement",
            3 => "Installation location",
            4 => "SQL Server connection",
            5 => "Installing",
            6 => "Completed",
            _ => ""
        };
        _stepSub.Text = i switch
        {
            0 => "Install RPM Assure on this Windows server",
            1 => "Choose how Setup looks on this machine",
            2 => "Review and accept to continue",
            3 => "Where application files are stored",
            4 => "Connect to RPMAssure_App (optional now)",
            5 => "Copying files and configuring the application",
            6 => "RPM Assure is ready",
            _ => ""
        };

        _btnBack.Enabled = i > 0 && i < 5;
        _btnBack.Visible = i < 6;
        _btnCancel.Visible = i < 6;
        _btnNext.Text = i switch
        {
            2 => "I Agree",
            4 => "Install",
            5 => "Please wait…",
            6 => "Finish",
            _ => "Next  >"
        };
        _btnNext.Enabled = i != 5;
        _btnNext.Apply(_theme, primary: true);
    }

    async Task OnNext()
    {
        if (_page == 0) { ShowPage(1); return; }
        if (_page == 1) { ShowPage(2); return; }
        if (_page == 2)
        {
            if (!_chkAgree.Checked)
            {
                MessageBox.Show(this, "Please accept the license terms to continue.", AppTitle,
                    MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }
            ShowPage(3);
            return;
        }
        if (_page == 3)
        {
            if (string.IsNullOrWhiteSpace(InstallDir))
            {
                MessageBox.Show(this, "Choose an install folder.", AppTitle);
                return;
            }
            ShowPage(4);
            return;
        }
        if (_page == 4)
        {
            ShowPage(5);
            _btnNext.Enabled = false;
            _btnBack.Enabled = false;
            _btnCancel.Enabled = false;
            try
            {
                await Task.Run(Install);
                ShowPage(6);
                _btnNext.Enabled = true;
                _btnNext.Text = "Finish";
                _btnNext.Apply(_theme, primary: true);
            }
            catch (Exception ex)
            {
                Log("ERROR: " + ex.Message);
                MessageBox.Show(this, "Install failed:\n\n" + ex.Message, AppTitle,
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
                _btnCancel.Enabled = true;
                _btnBack.Enabled = true;
                _btnNext.Enabled = true;
                _btnNext.Text = "Retry";
                _btnNext.Apply(_theme, primary: true);
            }
            return;
        }
        if (_page == 5) return;
        if (_page == 6)
        {
            if (_chkLaunch.Checked)
            {
                try
                {
                    var url = string.IsNullOrWhiteSpace(_txtUrl.Text)
                        ? "http://127.0.0.1:8081/login"
                        : _txtUrl.Text.Trim().TrimEnd('/') + "/login";
                    Process.Start(new ProcessStartInfo { FileName = url, UseShellExecute = true });
                }
                catch { /* ignore */ }
            }
            Close();
        }
    }

    void TestSql()
    {
        _lblSqlStatus.Text = "Testing…";
        _lblSqlStatus.ForeColor = _theme.Muted;
        Application.DoEvents();
        try
        {
            var server = _txtSqlServer.Text.Trim();
            if (string.IsNullOrEmpty(server))
            {
                _lblSqlStatus.Text = "Enter SQL Server host.";
                _lblSqlStatus.ForeColor = _theme.Danger;
                return;
            }
            string host = server;
            int port = 1433;
            if (server.Contains(','))
            {
                var parts = server.Split(',');
                host = parts[0].Trim();
                int.TryParse(parts[1].Trim(), out port);
            }
            using var client = new System.Net.Sockets.TcpClient();
            var ok = client.ConnectAsync(host, port).Wait(4000) && client.Connected;
            if (ok)
            {
                _lblSqlStatus.Text = $"TCP OK — {host}:{port} reachable";
                _lblSqlStatus.ForeColor = _theme.Success;
            }
            else
            {
                _lblSqlStatus.Text = $"Cannot reach {host}:{port}";
                _lblSqlStatus.ForeColor = _theme.Danger;
            }
        }
        catch (Exception ex)
        {
            _lblSqlStatus.Text = "Test failed: " + ex.Message;
            _lblSqlStatus.ForeColor = _theme.Danger;
        }
    }

    void Log(string msg)
    {
        void append() => _txtLog.AppendText($"[{DateTime.Now:HH:mm:ss}] {msg}\r\n");
        if (InvokeRequired) BeginInvoke(append); else append();
    }

    void SetProgress(int pct, string msg)
    {
        void apply()
        {
            _progress.Value = Math.Max(0, Math.Min(100, pct));
            _lblProgress.Text = msg;
            _lblProgress.ForeColor = _theme.Text;
        }
        if (InvokeRequired) BeginInvoke(apply); else apply();
        Log(msg);
    }

    void Install()
    {
        var dir = InstallDir;
        var data = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
            "RPM Resources", "RPM Assure");
        var cfgDir = Path.Combine(data, "config");
        var logDir = Path.Combine(data, "logs");

        SetProgress(5, "Creating folders…");
        Directory.CreateDirectory(dir);
        Directory.CreateDirectory(cfgDir);
        Directory.CreateDirectory(logDir);
        Directory.CreateDirectory(Path.Combine(data, "data"));

        SetProgress(15, "Locating payload…");
        var payload = FindPayload();
        if (payload == null)
            throw new FileNotFoundException(
                "payload.zip not found. Keep payload.zip next to RPMAssure-Setup.exe.");

        Log("Payload: " + payload);
        SetProgress(30, "Extracting application files…");
        ExtractPayload(payload, dir);

        var nested = Path.Combine(dir, @"app\.output\.output\server\index.mjs");
        var marker = Path.Combine(dir, @"app\.output\server\index.mjs");
        if (File.Exists(nested) && !File.Exists(marker))
        {
            SetProgress(50, "Fixing nested app output layout…");
            var bad = Path.Combine(dir, @"app\.output\.output");
            var good = Path.Combine(dir, @"app\.output");
            var tmp = Path.Combine(Path.GetTempPath(), "rpma_out_" + Guid.NewGuid().ToString("N"));
            Directory.Move(bad, tmp);
            if (Directory.Exists(good)) Directory.Delete(good, true);
            Directory.Move(tmp, good);
        }

        if (!File.Exists(Path.Combine(dir, @"app\.output\server\index.mjs")))
            throw new InvalidOperationException("Install incomplete: app\\.output\\server\\index.mjs missing.");

        SetProgress(65, "Writing configuration…");
        WriteConfig(cfgDir, dir);

        SetProgress(80, "Creating shortcuts…");
        CreateShortcuts(dir);

        SetProgress(90, "Starting application…");
        StartApp(dir);

        SetProgress(100, "Installation complete.");
    }

    string? FindPayload()
    {
        var candidates = new[]
        {
            Path.Combine(AppContext.BaseDirectory, "payload.zip"),
            Path.Combine(AppContext.BaseDirectory, "payload", "payload.zip"),
            Path.Combine(Directory.GetCurrentDirectory(), "payload.zip"),
            @"C:\RPM-Assure\installer\payload\payload.zip",
        };
        return candidates.FirstOrDefault(File.Exists);
    }

    void ExtractPayload(string zipPath, string destDir)
    {
        var tmp = Path.Combine(Path.GetTempPath(), "rpma_setup_" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tmp);
        try
        {
            ZipFile.ExtractToDirectory(zipPath, tmp, overwriteFiles: true);
            foreach (var entry in Directory.GetFileSystemEntries(tmp))
            {
                var name = Path.GetFileName(entry);
                var target = Path.Combine(destDir, name);
                if (Directory.Exists(target)) Directory.Delete(target, true);
                if (File.Exists(target)) File.Delete(target);
                if (Directory.Exists(entry)) CopyDir(entry, target);
                else File.Copy(entry, target, true);
                Log("  + " + name);
            }
            var copyZip = Path.Combine(destDir, "payload.zip");
            if (!File.Exists(copyZip)) File.Copy(zipPath, copyZip, true);
        }
        finally
        {
            try { Directory.Delete(tmp, true); } catch { /* ignore */ }
        }
    }

    static void CopyDir(string src, string dest)
    {
        Directory.CreateDirectory(dest);
        foreach (var file in Directory.GetFiles(src))
            File.Copy(file, Path.Combine(dest, Path.GetFileName(file)), true);
        foreach (var sub in Directory.GetDirectories(src))
            CopyDir(sub, Path.Combine(dest, Path.GetFileName(sub)));
    }

    void WriteConfig(string cfgDir, string installDir)
    {
        var envPath = Path.Combine(cfgDir, "app.env");
        var lines = new[]
        {
            $"# RPM Assure config — Setup {Version} {DateTime.UtcNow:u}",
            $"SETUP_THEME={_theme.Id}",
            $"SQL_SERVER={_txtSqlServer.Text.Trim()}",
            $"SQL_DATABASE={_txtSqlDb.Text.Trim()}",
            $"SQL_USER={_txtSqlUser.Text.Trim()}",
            $"SQL_PASSWORD={_txtSqlPass.Text}",
            $"SQL_TRUST_SERVER_CERTIFICATE={(_chkTrust.Checked ? "true" : "false")}",
            $"BETTER_AUTH_URL={_txtUrl.Text.Trim().TrimEnd('/')}",
            $"BETTER_AUTH_TRUSTED_ORIGINS={_txtUrl.Text.Trim().TrimEnd('/')}",
            "PORT=8081",
            "HOST=0.0.0.0",
            "NITRO_PORT=8081",
            $"INSTALL_DIR={installDir}",
        };
        File.WriteAllLines(envPath, lines);
        var appEnv = Path.Combine(installDir, "app", ".env.local");
        Directory.CreateDirectory(Path.GetDirectoryName(appEnv)!);
        File.Copy(envPath, appEnv, true);
        Log("Config: " + envPath);

        try
        {
            using var key = Microsoft.Win32.Registry.LocalMachine.CreateSubKey(
                @"Software\Microsoft\Windows\CurrentVersion\Uninstall\RPMAssure");
            if (key != null)
            {
                key.SetValue("DisplayName", "RPM Assure");
                key.SetValue("DisplayVersion", Version);
                key.SetValue("Publisher", "RPM Resources");
                key.SetValue("InstallLocation", installDir);
            }
            using var rp = Microsoft.Win32.Registry.LocalMachine.CreateSubKey(
                @"Software\RPM Resources\RPM Assure");
            rp?.SetValue("InstallDir", installDir);
            rp?.SetValue("Version", Version);
            rp?.SetValue("SetupTheme", _theme.Id);
        }
        catch (Exception ex) { Log("Registry note: " + ex.Message); }
    }

    void CreateShortcuts(string installDir)
    {
        try
        {
            var programs = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.CommonStartMenu),
                "Programs", "RPM Assure");
            Directory.CreateDirectory(programs);
            var url = _txtUrl.Text.Trim().TrimEnd('/') + "/login";
            File.WriteAllText(Path.Combine(programs, "RPM Assure Login.url"),
                $"[InternetShortcut]\r\nURL={url}\r\n");
            var startPs1 = Path.Combine(installDir, "service", "Start-Service.ps1");
            if (File.Exists(startPs1))
            {
                File.WriteAllText(Path.Combine(programs, "Start App.cmd"),
                    $"@echo off\r\npowershell -NoProfile -ExecutionPolicy Bypass -File \"{startPs1}\"\r\n");
            }
            if (_chkDesktop.Checked)
            {
                var desk = Environment.GetFolderPath(Environment.SpecialFolder.CommonDesktopDirectory);
                File.WriteAllText(Path.Combine(desk, "RPM Assure.url"),
                    $"[InternetShortcut]\r\nURL={url}\r\n");
            }
        }
        catch (Exception ex) { Log("Shortcut note: " + ex.Message); }
    }

    void StartApp(string installDir)
    {
        var start = Path.Combine(installDir, "service", "Start-Service.ps1");
        if (!File.Exists(start))
        {
            Directory.CreateDirectory(Path.Combine(installDir, "service"));
            File.WriteAllText(start, @"
$ErrorActionPreference='Continue'
$root = Split-Path (Split-Path $MyInvocation.MyCommand.Path -Parent) -Parent
$logs = Join-Path $env:ProgramData 'RPM Resources\RPM Assure\logs'
New-Item -ItemType Directory -Force -Path $logs | Out-Null
$cfg = Join-Path $env:ProgramData 'RPM Resources\RPM Assure\config\app.env'
$app = Join-Path $root 'app'
if ((Test-Path $cfg) -and (Test-Path $app)) { Copy-Item $cfg (Join-Path $app '.env.local') -Force }
$node = Join-Path $root 'runtime\node\node.exe'
$entry = Join-Path $root 'app\.output\server\index.mjs'
if (-not (Test-Path $node)) { $node = (Get-Command node -EA SilentlyContinue).Source }
if (-not ((Test-Path $node) -and (Test-Path $entry))) { throw 'Missing node or app entry' }
Get-NetTCPConnection -LocalPort 8081 -State Listen -EA SilentlyContinue | % {
  if ($_.OwningProcess -gt 0) { Stop-Process -Id $_.OwningProcess -Force -EA SilentlyContinue }
}
$stdout = Join-Path $logs 'app-stdout.log'
$stderr = Join-Path $logs 'app-stderr.log'
$cmd = ""cd /d `""$app`"" && set PORT=8081&& set NITRO_PORT=8081&& set HOST=0.0.0.0&& `""$node`"" `""$entry`"" >> `""$stdout`"" 2>> `""$stderr`""""
Start-Process cmd.exe -ArgumentList '/c',$cmd -WorkingDirectory $app -WindowStyle Hidden
Write-Host 'Started'
");
        }

        var psi = new ProcessStartInfo
        {
            FileName = "powershell.exe",
            Arguments = $"-NoProfile -ExecutionPolicy Bypass -File \"{start}\"",
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true
        };
        using var p = Process.Start(psi);
        p?.WaitForExit(60000);
        Log((p?.StandardOutput.ReadToEnd() ?? "").Trim());
        Log((p?.StandardError.ReadToEnd() ?? "").Trim());

        try
        {
            System.Threading.Thread.Sleep(3000);
            using var http = new System.Net.Http.HttpClient { Timeout = TimeSpan.FromSeconds(8) };
            var resp = http.GetAsync("http://127.0.0.1:8081/login").Result;
            Log($"Health: {(int)resp.StatusCode}");
        }
        catch (Exception ex)
        {
            Log("Health check: " + ex.Message);
        }
    }
}
