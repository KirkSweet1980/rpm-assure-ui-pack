using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Text;
using System.Windows.Forms;

namespace RpmAssure
{
    public static class Bootstrap
    {
        const string DefaultUrl = "https://assure.rpmresources.co.za";
        const string Root = @"C:\RPM-Assure";
        const string Agent = @"C:\RPM-Assure\Agent";

        [STAThread]
        public static int Main(string[] args)
        {
            ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
            string code = Arg(args, "-CustomerCode");
            string url = Arg(args, "-Url");
            if (string.IsNullOrEmpty(url)) url = DefaultUrl;
            if (string.IsNullOrEmpty(code))
            {
                if (!Environment.UserInteractive)
                    throw new Exception("CUSTOMERCODE is required (msiexec /i rpm-assure-agent.msi CUSTOMERCODE=AHIC)");
                code = PromptCode();
                if (string.IsNullOrEmpty(code)) return 2;
            }
            code = code.Trim().ToUpperInvariant();
            try
            {
                Directory.CreateDirectory(Agent);
                Directory.CreateDirectory(Path.Combine(Agent, "logs"));
                string zip = Path.Combine(Path.GetTempPath(), "rpm-assure-agent.zip");
                string zipUrl = url.TrimEnd('/') + "/downloads/rpm-assure-agent.zip";
                Log("GET " + zipUrl);
                using (var wc = new WebClient())
                {
                    wc.Headers.Add("Cache-Control", "no-cache");
                    wc.DownloadFile(zipUrl, zip);
                }
                if (!File.Exists(zip) || new FileInfo(zip).Length < 1000)
                    throw new Exception("agent zip empty");
                string pack = Path.Combine(Root, @"deploy\ui-pack");
                if (Directory.Exists(pack))
                {
                    try { Directory.Delete(pack, true); } catch { }
                }
                Directory.CreateDirectory(pack);
                ZipFile.ExtractToDirectory(zip, pack);
                string src = Path.Combine(pack, @"Sql\agent");
                if (!File.Exists(Path.Combine(src, "RpmAssure-Agent.ps1")))
                    src = Path.Combine(pack, @"sql\agent");
                if (!File.Exists(Path.Combine(src, "RpmAssure-Agent.ps1")))
                    throw new Exception("pack missing RpmAssure-Agent.ps1");
                CopyTree(src, Agent);
                WriteSettings(code, url);
                WriteConfig(code);
                RunPs(Path.Combine(Agent, "Install-Agent-Service.ps1"));
                Log("OK customer=" + code);
                return 0;
            }
            catch (Exception ex)
            {
                Log("FAIL " + ex.Message);
                MessageBox.Show(ex.Message, "RPM Assure Agent", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return 1;
            }
        }

        static string Arg(string[] args, string name)
        {
            for (int i = 0; i < args.Length - 1; i++)
                if (string.Equals(args[i], name, StringComparison.OrdinalIgnoreCase))
                    return args[i + 1];
            return "";
        }

        static string PromptCode()
        {
            var f = new Form();
            f.Text = "RPM Assure Edge Agent";
            f.Width = 420;
            f.Height = 160;
            f.FormBorderStyle = FormBorderStyle.FixedDialog;
            f.StartPosition = FormStartPosition.CenterScreen;
            f.MaximizeBox = false;
            var lbl = new Label();
            lbl.Text = "Customer code (AHIC, UVSS, ...)";
            lbl.Left = 16; lbl.Top = 16; lbl.Width = 360;
            var tb = new TextBox();
            tb.Left = 16; tb.Top = 40; tb.Width = 370;
            var ok = new Button();
            ok.Text = "Install";
            ok.Left = 220; ok.Top = 76; ok.DialogResult = DialogResult.OK;
            var cancel = new Button();
            cancel.Text = "Cancel";
            cancel.Left = 310; cancel.Top = 76; cancel.DialogResult = DialogResult.Cancel;
            f.Controls.Add(lbl);
            f.Controls.Add(tb);
            f.Controls.Add(ok);
            f.Controls.Add(cancel);
            f.AcceptButton = ok;
            f.CancelButton = cancel;
            return f.ShowDialog() == DialogResult.OK ? tb.Text : "";
        }

        static void CopyTree(string from, string to)
        {
            foreach (var file in Directory.GetFiles(from, "*", SearchOption.AllDirectories))
            {
                string name = Path.GetFileName(file);
                if (name.Equals("Agent.Config.ps1", StringComparison.OrdinalIgnoreCase)) continue;
                if (name.Equals("Agent.Settings.json", StringComparison.OrdinalIgnoreCase)) continue;
                if (name.Equals("Agent.Secrets.bin", StringComparison.OrdinalIgnoreCase)) continue;
                string rel = file.Substring(from.Length).TrimStart('\\', '/');
                if (rel.IndexOf(@"\logs\", StringComparison.OrdinalIgnoreCase) >= 0) continue;
                if (rel.IndexOf(@"\installer\", StringComparison.OrdinalIgnoreCase) >= 0) continue;
                string dest = Path.Combine(to, rel);
                Directory.CreateDirectory(Path.GetDirectoryName(dest));
                File.Copy(file, dest, true);
            }
        }

        static void WriteSettings(string code, string url)
        {
            string secret = Environment.GetEnvironmentVariable("RPM_ASSURE_IOPS_SECRET");
            if (string.IsNullOrEmpty(secret))
                secret = Environment.GetEnvironmentVariable("RPM_ASSURE_AGENT_SECRET");
            if (string.IsNullOrEmpty(secret))
                secret = "xc9pDuhf7ldzcmkwsE+joSdgpuD5RJaz";
            var sb = new StringBuilder();
            sb.AppendLine("{");
            sb.AppendLine("  \"collectIntervalMin\": 2,");
            sb.AppendLine("  \"jobsIntervalMin\": 1440,");
            sb.AppendLine("  \"tickSeconds\": 120,");
            sb.AppendLine("  \"centralDataSource\": \"\",");
            sb.AppendLine("  \"centralDatabase\": \"RPMAssure_App\",");
            sb.AppendLine("  \"centralSqlUser\": \"\",");
            sb.AppendLine("  \"encryptSql\": false,");
            sb.AppendLine("  \"trustSqlCert\": true,");
            sb.AppendLine("  \"appHttpsUrl\": \"" + url.Replace("\\", "\\\\").Replace("\"", "\\\"") + "\",");
            sb.AppendLine("  \"agentSecret\": \"" + secret.Replace("\\", "\\\\").Replace("\"", "\\\"") + "\",");
            sb.AppendLine("  \"customerCode\": \"" + code.Replace("\\", "\\\\").Replace("\"", "\\\"") + "\"");
            sb.AppendLine("}");
            File.WriteAllText(Path.Combine(Agent, "Agent.Settings.json"), sb.ToString(), new UTF8Encoding(false));
        }

        static void WriteConfig(string code)
        {
            string path = Path.Combine(Agent, "Agent.Config.ps1");
            if (File.Exists(path)) return;
            var lines = new string[] {
                "$CustomerCode = '" + code.Replace("'", "''") + "'",
                "$DisplayName = '" + code.Replace("'", "''") + "'",
                "$InstanceName = $env:COMPUTERNAME",
                "$RoleTags = 'edge'",
                "$CentralDataSource = ''",
                "$CentralDatabase = 'RPMAssure_App'",
                "$CentralSqlUser = ''",
                "$SqlRoot = 'C:\\RPM-Assure\\Sql'",
                "$AgentRoot = 'C:\\RPM-Assure\\Agent'",
                "$LogDir = 'C:\\RPM-Assure\\Agent\\logs'"
            };
            File.WriteAllLines(path, lines);
        }

        static void RunPs(string file)
        {
            if (!File.Exists(file)) throw new Exception("missing " + file);
            var p = new Process();
            p.StartInfo.FileName = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), @"WindowsPowerShell\v1.0\powershell.exe");
            p.StartInfo.Arguments = "-NoProfile -ExecutionPolicy Bypass -File \"" + file + "\" -AgentRoot \"" + Agent + "\"";
            p.StartInfo.UseShellExecute = false;
            p.StartInfo.RedirectStandardOutput = true;
            p.StartInfo.RedirectStandardError = true;
            p.Start();
            string o = p.StandardOutput.ReadToEnd() + p.StandardError.ReadToEnd();
            p.WaitForExit();
            Log(o);
            if (p.ExitCode != 0) throw new Exception("Install-Agent-Service exit=" + p.ExitCode);
        }

        static void Log(string m)
        {
            try
            {
                Directory.CreateDirectory(Path.Combine(Agent, "logs"));
                File.AppendAllText(Path.Combine(Agent, @"logs\msi-bootstrap.log"), DateTime.UtcNow.ToString("u") + " " + m + "\r\n");
            }
            catch { }
            Console.WriteLine(m);
        }
    }
}
