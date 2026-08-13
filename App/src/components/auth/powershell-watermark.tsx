/**
 * Animated PowerShell terminal watermark behind login form.
 * Generic sysadmin / PowerShell samples only (no product-specific names).
 */

const PS_SCRIPT = [
  "Windows PowerShell",
  "Copyright (C) Microsoft Corporation. All rights reserved.",
  "",
  "PS C:\\Users\\Admin> Get-Date -Format 'u'",
  "2026-08-10 16:41:02Z",
  "PS C:\\Users\\Admin> $PSVersionTable.PSVersion",
  "",
  "Major  Minor  Build  Revision",
  "-----  -----  -----  --------",
  "5      1      22621  4391",
  "",
  "PS C:\\Users\\Admin> Get-Process | Sort-Object CPU -Descending | Select-Object -First 5",
  "",
  "Handles  NPM(K)    PM(K)      WS(K)   CPU(s)     Id  ProcessName",
  "-------  ------    -----      -----   ------     --  -----------",
  "   1240      82   210448     189220    42.11   4820  chrome",
  "    890      54    98412      76110    18.04   2104  explorer",
  "    612      41    55220      48008     9.72   3312  Code",
  "    404      28    22110      19880     3.15   1188  svchost",
  "    288      19    14220      12004     1.88   4500  notepad",
  "",
  "PS C:\\Users\\Admin> Get-Service | Where-Object Status -eq 'Running' | Select -First 4",
  "",
  "Status   Name               DisplayName",
  "------   ----               -----------",
  "Running  wuauserv           Windows Update",
  "Running  EventLog           Windows Event Log",
  "Running  Dnscache           DNS Client",
  "Running  WinRM              Windows Remote Management",
  "",
  "PS C:\\Scripts> .\\Invoke-HealthCheck.ps1 -ComputerName SRV01",
  ">> Checking disk free space...",
  ">> C:  42% free",
  ">> D:  61% free",
  ">> Checking last boot time...",
  ">> LastBoot: 2026-08-03 06:12:41",
  ">> Result: Healthy",
  "PS C:\\Scripts> Test-NetConnection contoso.example -Port 443 | Select TcpTestSucceeded",
  "",
  "TcpTestSucceeded",
  "----------------",
  "True",
  "",
  "PS C:\\Scripts> Get-ChildItem C:\\Logs -Filter *.log | Measure-Object",
  "",
  "Count    : 24",
  "Average  :",
  "Sum      :",
  "Maximum  :",
  "Minimum  :",
  "Property :",
  "",
  "PS C:\\Scripts> Write-Host 'Session ready.' -ForegroundColor Green",
  "Session ready.",
  "PS C:\\Scripts> _",
];

function TerminalBlock({ className }: { className?: string }) {
  return (
    <div className={className}>
      {PS_SCRIPT.map((line, i) => {
        const isPrompt = line.startsWith("PS ") || line.startsWith(">>");
        const isHeader = i < 2;
        const isOk =
          line === "Session ready." ||
          line === "True" ||
          line.includes("Running") ||
          line.includes("Result: Healthy");
        const isCursorLine = line === "PS C:\\Scripts> _";

        if (isCursorLine) {
          return (
            <div key={i} className="rpma-ps-line is-prompt">
              <span className="rpma-ps-prompt">{"PS C:\\Scripts> "}</span>
              <span className="rpma-ps-cursor" />
            </div>
          );
        }

        if (isPrompt) {
          const m = line.match(/^(PS [^>]*>|>>)\s?(.*)$/);
          const prompt = m ? m[1] : "PS>";
          const cmd = m ? m[2] : line;
          return (
            <div key={i} className="rpma-ps-line is-prompt">
              <span className="rpma-ps-prompt">{prompt + " "}</span>
              <span className="rpma-ps-cmd">{cmd}</span>
            </div>
          );
        }

        return (
          <div
            key={i}
            className={[
              "rpma-ps-line",
              isHeader ? "is-header" : "",
              isOk ? "is-ok" : "",
              line === "" ? "is-blank" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span className="rpma-ps-out">{line || "\u00a0"}</span>
          </div>
        );
      })}
    </div>
  );
}

export function PowershellWatermark() {
  return (
    <div className="rpma-ps-wm" aria-hidden="true">
      <div className="rpma-ps-track">
        <TerminalBlock className="rpma-ps-block" />
        <TerminalBlock className="rpma-ps-block" />
      </div>
      <div className="rpma-ps-vignette" />
    </div>
  );
}
