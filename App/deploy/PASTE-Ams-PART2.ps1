# PART 2 — paste this ENTIRE block after Part 1 succeeds.
$ErrorActionPreference = 'Stop'
$App = 'C:\RPM-Assure\App'
$Utf8 = New-Object System.Text.UTF8Encoding $false
function W($c,$m){ Write-Host $m -ForegroundColor $c }
function Patch([string]$Path,[string]$Find,[string]$Replace,[string]$Tag){
  if (-not (Test-Path -LiteralPath $Path)) { W Yellow "SKIP missing $Path"; return }
  $t = [IO.File]::ReadAllText($Path)
  if ($t.Contains($Tag)) { W DarkGray "already $Tag"; return }
  if (-not $t.Contains($Find)) { W Yellow "WARN marker not found for $Tag in $Path"; return }
  $t2 = $t.Replace($Find, $Replace)
  [IO.File]::WriteAllText($Path, $t2, $Utf8)
  W Green "patched $Tag"
}
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { throw 'Run as Administrator.' }
if (-not (Test-Path $App)) { throw "Missing $App" }


W Cyan '=== Patch existing files ==='

# types
Patch (Join-Path $App 'src\lib\data\types.ts') `
  "  hotfixGapSummary: HotfixGapSummary | null;`r`n" `
  "  hotfixGapSummary: HotfixGapSummary | null;`r`n  dayEnd?: import(`"./day-end`").DayEndSnapshot | null;`r`n" `
  'dayEnd?:'
# also try LF-only
Patch (Join-Path $App 'src\lib\data\types.ts') `
  "  hotfixGapSummary: HotfixGapSummary | null;`n" `
  "  hotfixGapSummary: HotfixGapSummary | null;`n  dayEnd?: import(`"./day-end`").DayEndSnapshot | null;`n" `
  'dayEnd?:'

# nav
Patch (Join-Path $App 'src\components\nav\customer-workspace-nav.tsx') `
  '  { label: "Jobs", path: "jobs" },' `
  "  { label: `"Jobs`", path: `"jobs`" },`n  { label: `"Day end`", path: `"day-end`" }," `
  'path: "day-end"'

# page title
Patch (Join-Path $App 'src\routes\customers.$code.tsx') `
  '      jobs: "Jobs",' `
  "      jobs: `"Jobs`",`n      `"day-end`": `"Day end`"," `
  '"day-end": "Day end"'

# reports pack card (replace old monthly blurb if present)
$rep = Join-Path $App 'src\routes\reports.tsx'
if (Test-Path $rep) {
  $rt = [IO.File]::ReadAllText($rep)
  if ($rt.Contains('Monthly AMS pack')) { W DarkGray 'reports already Monthly AMS pack' }
  elseif ($rt.Contains('Monthly RPM Assure board pack')) {
    $rt2 = $rt.Replace('Monthly RPM Assure board pack','Monthly AMS pack').Replace(
      'ExCo deck: uptime, FinSight integrity, risks, priorities, hotfixes.',
      'Signed SLA: health, day-end, jobs, FinSight, operators, hotfixes, RPM clocks.')
    [IO.File]::WriteAllText($rep, $rt2, $Utf8)
    W Green 'patched reports monthly pack title'
  }
}

# fill-customer-panels
$fill = Join-Path $App 'src\lib\data\fill-customer-panels.ts'
if (Test-Path $fill) {
  $ft = [IO.File]::ReadAllText($fill)
  if (-not $ft.Contains('from "./day-end"')) {
    $ft = $ft.Replace(
      'import { extractProgramCode, formatProgramLabel } from "./syspro-programs";',
      "import { extractProgramCode, formatProgramLabel } from `"./syspro-programs`";`nimport { buildDayEndSnapshot, isJobFailed } from `"./day-end`";"
    )
  }
  if (-not $ft.Contains('dayEnd:')) {
    $ft = $ft.Replace(
      '    hotfixGapSummary,',
      "    hotfixGapSummary,`n    dayEnd: raw.dayEnd ?? buildDayEndSnapshot({ jobs: (typeof jobErrorsOut !== 'undefined' ? jobErrorsOut : (raw.jobErrors ?? [])).map((j: any) => ({ ...j, failed: isJobFailed(j) })), taskGroups: typeof taskGroups !== 'undefined' ? taskGroups : (raw.taskGroups ?? []), lastImportAt: c.lastImportAt }),"
    )
  }
  [IO.File]::WriteAllText($fill, $ft, $Utf8)
  W Green 'patched fill-customer-panels'
}

# live-portfolio: import + SQL + Promise.all + mapping + return
$lp = Join-Path $App 'src\lib\data\live-portfolio.ts'
if (Test-Path $lp) {
  $lt = [IO.File]::ReadAllText($lp)
  if (-not $lt.Contains('from "./day-end"')) {
    $lt = $lt.Replace(
      'from "./health-rag";',
      "from `"./health-rag`";`nimport { buildDayEndSnapshot, isDayEndText, isJobFailed, type DayEndSnapshot } from `"./day-end`";"
    )
  }
  if (-not $lt.Contains('DAYEND_JOBS_SQL')) {
    $sql = @'
const DAYEND_JOBS_SQL = `
SELECT TOP (80)
  ProgramName, Operator, Message, ErrorStatusCode, ProgErrorCode, ProgRunDate, TransactionStatus
FROM dbo.Syspro_JobLogging
WHERE InstanceName = @instance
  AND SnapshotDate = (SELECT MAX(SnapshotDate) FROM dbo.Syspro_JobLogging WHERE InstanceName = @instance)
  AND (
    ProgramName LIKE N'%DAY%' OR ProgramName LIKE N'%IMPDDE%' OR ProgramName LIKE N'%IMPPDE%'
    OR ProgramName LIKE N'%IMPDCO%' OR Operator LIKE N'%DAY%' OR Operator LIKE N'%SRS%'
    OR Message LIKE N'%day end%' OR Message LIKE N'%day-end%' OR Message LIKE N'%Day End%'
  )
ORDER BY ProgRunDate DESC;
`;
'@
    $lt = $lt.Replace("const DTR_L1_SQL = `", $sql + "`r`nconst DTR_L1_SQL = `")
    if (-not $lt.Contains('DAYEND_JOBS_SQL')) {
      $lt = $lt.Replace("const DTR_L1_SQL = `", $sql + "`nconst DTR_L1_SQL = `")
    }
  }
  if (-not $lt.Contains('instQ(DAYEND_JOBS_SQL)')) {
    $lt = $lt.Replace('instQ(JOBS_SQL),', "instQ(JOBS_SQL),`n      instQ(DAYEND_JOBS_SQL),")
    $lt = $lt.Replace('jobsRes,`r`n    ] = await Promise.all([', "jobsRes,`r`n      dayEndRes,`r`n    ] = await Promise.all([")
    $lt = $lt.Replace('jobsRes,`n    ] = await Promise.all([', "jobsRes,`n      dayEndRes,`n    ] = await Promise.all([")
  }
  if (-not $lt.Contains('let dayEnd:')) {
    $lt = $lt.Replace(
      'let hotfixGapSummary: HotfixGapSummary | null = null;',
      "let hotfixGapSummary: HotfixGapSummary | null = null;`n  let dayEnd: DayEndSnapshot | null = null;"
    )
  }
  if (-not $lt.Contains('dayEnd = buildDayEndSnapshot')) {
    $hook = "      progRunDate: toIso(j.ProgRunDate),`r`n    }));`r`n  }"
    $ins = @'
      progRunDate: toIso(j.ProgRunDate),
    }));
    try {
      const deJobs = ((typeof dayEndRes !== "undefined" && dayEndRes?.recordset) ? dayEndRes.recordset : []).map((j: any) => ({
        programName: j.ProgramName, operator: j.Operator, message: j.Message,
        errorStatusCode: j.ErrorStatusCode,
        progErrorCode: j.ProgErrorCode != null ? Number(j.ProgErrorCode) : null,
        progRunDate: toIso(j.ProgRunDate), transactionStatus: j.TransactionStatus,
        failed: isJobFailed({ errorStatusCode: j.ErrorStatusCode, progErrorCode: j.ProgErrorCode, transactionStatus: j.TransactionStatus, message: j.Message }),
      }));
      dayEnd = buildDayEndSnapshot({
        jobs: deJobs,
        taskGroups: [...(taskGroups||[]), ...((taskItems||[]).map((i: any) => ({ taskGroup: i.taskGroup, description: `${i.description||""} ${i.programName||""}` })))],
        lastImportAt: customer.lastImportAt,
      });
    } catch { dayEnd = null; }
  }
'@
    if ($lt.Contains($hook)) { $lt = $lt.Replace($hook, $ins) }
    else {
      $hook2 = "      progRunDate: toIso(j.ProgRunDate),`n    }));`n  }"
      if ($lt.Contains($hook2)) { $lt = $lt.Replace($hook2, $ins) }
      else { W Yellow 'WARN: jobErrors close hook not found — dayEnd mapping skipped' }
    }
  }
  if ($lt.Contains('hotfixGapSummary,') -and -not $lt.Contains('dayEnd,')) {
    $lt = $lt.Replace('    hotfixGapSummary,', "    hotfixGapSummary,`n    dayEnd,")
  }
  $lt = $lt.Replace('availabilitySlaPct: availabilitySla?.availabilitySlaPct ?? 99.5', 'availabilitySlaPct: availabilitySla?.availabilitySlaPct ?? null')
  [IO.File]::WriteAllText($lp, $lt, $Utf8)
  W Green 'patched live-portfolio'
}

# customer-sections: import + DayEndSection + hub tiles + AMS print
$csf = Join-Path $App 'src\components\customer\customer-sections.tsx'
if (Test-Path $csf) {
  $ct = [IO.File]::ReadAllText($csf)
  if (-not $ct.Contains('from "@/lib/data/day-end"')) {
    $ct = $ct.Replace(
      'from "@/lib/data/exco-sla-stats";',
      "from `"@/lib/data/exco-sla-stats`";`nimport { dayEndTone } from `"@/lib/data/day-end`";"
    )
    if (-not $ct.Contains('from "@/lib/data/day-end"')) {
      $ct = "import { dayEndTone } from `"@/lib/data/day-end`";`n" + $ct
    }
  }
  if (-not $ct.Contains('export function DayEndSection')) {
    if ($ct.Contains('export function JobsSection')) {
      $ct = $ct.Replace('export function JobsSection', @'
DAYSEC_PLACEHOLDER
export function JobsSection
'@)
      $ct = $ct.Replace('DAYSEC_PLACEHOLDER', @'
export function DayEndSection({ data }: { data: CustomerDetailPayload }) {
  if (!effectiveCover(data).syspro) {
    return (
      <NoCoverPanel
        service="Day end"
        hint="No cover — no SYSPRO data for this customer."
      />
    );
  }
  const snap = data.dayEnd ?? null;
  if (!snap) {
    return (
      <p className="text-sm text-muted">Day-end status is not available on this snapshot.</p>
    );
  }
  const tone = dayEndTone(snap.status);
  return (
    <div className="space-y-3">
      <ChartCaption
        title="Automated day-end"
        why="AMS clause 4.5 — Monday to Friday, Business Days. Weekends and public holidays are excluded unless Standby Support is taken."
      />
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <StatCard
          label="Status"
          value={snap.label}
          tone={tone}
          hint={snap.expectedToday ? "Expected today" : "Not a Business Day"}
        />
        <StatCard
          label="Last run"
          value={snap.lastRunAt ? formatSastDateTime(snap.lastRunAt) : "—"}
          hint="From SYSPRO job logging"
        />
        <StatCard
          label="Password risk"
          value={snap.passwordRisk ? "Yes" : "Clear"}
          tone={snap.passwordRisk ? "red" : "green"}
          hint="Clause 4.5 / 6.7 — notify RPM of credential changes"
        />
        <StatCard
          label="Task groups"
          value={snap.taskGroups.length}
          hint={snap.taskGroups[0] || "No day-end task group named"}
        />
      </div>
      <div
        className={cn(
          "rounded-xl border px-3 py-2 text-[12px] leading-relaxed",
          tone === "red"
            ? "border-rag-red/30 bg-rag-red/10 text-fg"
            : tone === "green"
              ? "border-rag-green/30 bg-rag-green/10 text-fg"
              : "border-border bg-surface-2 text-muted",
        )}
      >
        {snap.detail}
        {snap.passwordRiskNote ? (
          <p className="mt-1 font-medium text-fg">{snap.passwordRiskNote}</p>
        ) : null}
        <p className="mt-1 text-[11px] text-subtle">As of {snap.asOfSast}</p>
      </div>
      {snap.taskGroups.length > 0 ? (
        <Card>
          <CardHead>Day-end task groups</CardHead>
          <CardContent className="text-[12px]">
            <ul className="list-disc space-y-1 pl-4">
              {snap.taskGroups.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHead>Matching jobs ({snap.jobs.length})</CardHead>
        <CardContent className="space-y-2">
          {snap.jobs.length === 0 ? (
            <p className="text-xs text-muted">
              No day-end-named jobs on the latest collect. Status uses task groups and the Business Day window only.
            </p>
          ) : (
            snap.jobs.map((j, i) => (
              <div key={i} className="rounded-md border border-border px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <ProgramLabel code={j.programName} showDescription />
                  <Badge variant={j.failed ? "red" : "green"}>{j.failed ? "Failed" : "Ran"}</Badge>
                </div>
                {j.message ? (
                  <p className="mt-1 text-[12px] text-muted line-clamp-2">{j.message}</p>
                ) : null}
                <p className="mt-0.5 text-[11px] text-subtle">
                  {j.operator ?? "—"} · {formatSastDateTime(j.progRunDate)}
                  {j.progErrorCode != null ? ` · error ${j.progErrorCode}` : ""}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}


'@)
    }
  }
  if (-not $ct.Contains('title="Day end"')) {
    $ct = $ct.Replace(
      '<DrillCard to={`${base}/operators`} title="Operators"',
      @'
<DrillCard
          to={`${base}/day-end`}
          title="Day end"
          blurb="Ran · failed · skipped · password risk"
          icon={ClipboardList}
        />
        <DrillCard to={`${base}/operators`} title="Operators"
'@
    )
  }
  if (-not $ct.Contains('Print monthly AMS pack')) {
    $ct = $ct.Replace(
      'Managed service pack for <strong className="text-fg">{c.displayName}</strong>.',
      @'
Managed service pack for <strong className="text-fg">{c.displayName}</strong>.
      </p>
      <SpaLink
        href={`/reports?format=ams-monthly&customer=${encodeURIComponent(c.customerCode)}`}
        className="flex min-h-11 items-center gap-3 rounded-xl border border-accent/40 bg-accent-soft px-3 py-2.5 text-[13px] font-semibold text-fg hover:border-accent"
      >
        Print monthly AMS pack
      </SpaLink>
      <p className="hidden">
'@
    )
  }
  if (-not $ct.Contains('ClipboardList')) {
    $ct = $ct.Replace('  ClipboardList,`n', '')
    $ct = $ct.Replace("  Database,", "  ClipboardList,`n  Database,")
  }
  if (-not $ct.Contains('  Printer,')) {
    $ct = $ct.Replace("  Package,", "  Package,`n  Printer,")
  }
  [IO.File]::WriteAllText($csf, $ct, $Utf8)
  W Green 'patched customer-sections'
}

# monthly pack HTML + report-build wire
$htmlf = Join-Path $App 'src\lib\mail\ams-report-html.ts'
if (Test-Path $htmlf) {
  $ht = [IO.File]::ReadAllText($htmlf)
  if (-not $ht.Contains('buildMonthlyAmsPackHtml')) {
    if (-not $ht.Contains('sla-metrics')) {
      $ht = $ht.Replace(
        'from "@/lib/data/rmm-device-class";',
        "from `"@/lib/data/rmm-device-class`";`nimport { RPM_CONTRACT_CLOCKS, RPM_SECURITY_ADMIN, RPM_SLA_REVISION } from `"@/lib/data/sla-metrics`";`nimport { buildDayEndSnapshot } from `"@/lib/data/day-end`";"
      )
    }
    $marker = '/** Full Applications RPM Assure Report'
    if ($ht.Contains($marker)) {
      $ht = $ht.Replace($marker, @'
MONTHLY_PLACEHOLDER
/** Full Applications RPM Assure Report
'@)
      $ht = $ht.Replace('MONTHLY_PLACEHOLDER', @'
/** Clause 4.8 monthly AMS pack — SYSPRO Support + AMS only. */
export function buildMonthlyAmsPackHtml(opts: {
  customer: CustomerDetailPayload;
  portfolio?: PortfolioPayload | null;
}): { subject: string; html: string; text: string } {
  const detail = opts.customer;
  const c = detail.customer;
  const now = formatSastDateTime(new Date().toISOString());
  const dateLabel = formatSastDate(new Date().toISOString());
  const monthLabel = new Date().toLocaleDateString("en-ZA", {
    month: "long",
    year: "numeric",
    timeZone: "Africa/Johannesburg",
  });
  const title = `Monthly AMS pack — ${monthLabel} — ${c.displayName}`;

  const dtr = detail.dtrLevel1 ?? [];
  const fs = finsightScore(dtr);
  const jobs = detail.jobErrors ?? [];
  const ops = detail.operators ?? [];
  const amends = detail.operAmends ?? [];
  const hotfixes = detail.sysproHotfixes ?? [];
  const gap = detail.hotfixGapSummary;
  const license = detail.license;
  const ver = detail.sysproVersion;
  const oa = detail.operationalAssurance;
  const sla = detail.availabilitySla;
  const dayEnd =
    detail.dayEnd ??
    buildDayEndSnapshot({
      jobs: jobs.map((j) => ({ ...j, failed: false })),
      taskGroups: detail.taskGroups ?? [],
      lastImportAt: c.lastImportAt,
    });
  const collectHours = oa?.collectAgeHours;
  const collectFresh = oa?.collectFresh ?? (collectHours != null && collectHours <= 24);
  const ticketMeasured =
    sla?.source === "live-incident" || sla?.source === "sla-period" || sla?.source === "snapshot";

  const byProg = new Map<string, number>();
  for (const j of jobs) {
    const k = formatProgramLabel(j.programName) || j.programName || "Unknown";
    byProg.set(k, (byProg.get(k) ?? 0) + 1);
  }
  const topProg = [...byProg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  const recentAmends = amends.slice(0, 12);
  const oobMods = dtr.filter((r) => (r.varianceLineCount || 0) > 0);

  const body = `
<div class="cover">
  <div class="cover-arc"></div>
  <div class="cover-dot"></div>
  <h1>Monthly AMS pack — ${esc(monthLabel)}</h1>
  <h2>${esc(c.displayName)} · ${esc(c.customerCode)}</h2>
  <div class="brand-row">
    <div class="brand">RPM <span>Assure</span></div>
    <div class="muted" style="font-size:12pt">SYSPRO Support & AMS · Rev ${esc(RPM_SLA_REVISION)} · Health <span class="${ragClass(c.healthRag)}">${esc(c.healthRag)}</span></div>
  </div>
</div>

<div class="page">
  <div class="note">
    <strong>What this pack is</strong>
    <p style="margin:6px 0 0">Monthly evidence for the <strong>signed SYSPRO Support + AMS SLA</strong> (clause 4.8). Ticket clocks are targets, not guarantees (7.5). There is <strong>no availability percentage</strong>. Cloud Backup, EPP and Microsoft 365 are <strong>not</strong> in this contract and are omitted.</p>
  </div>

  <h3 class="sub">1. Health & collect</h3>
  <table class="ams">
    <thead><tr><th class="dark">Health</th><th class="dark">Collect</th><th class="dark">Age</th><th class="dark">Active users</th><th class="dark">Instance</th></tr></thead>
    <tbody>
      <tr>
        <td class="${ragClass(c.healthRag)}">${esc(c.healthRag)}</td>
        <td class="${collectFresh ? "ok" : "bad"}">${collectFresh ? "Fresh (≤24h)" : c.lastImportAt ? "Stale" : "Missing"}</td>
        <td>${collectHours != null ? esc(Math.round(collectHours) + "h") : "—"}</td>
        <td>${esc(c.activeUserCount)} / ${esc(c.operatorCount)}</td>
        <td>${esc(c.sqlInstanceName || "—")}</td>
      </tr>
    </tbody>
  </table>
  <p class="muted">${esc(c.healthSummary || oa?.summary || "")}</p>
  <p class="muted">Last collect (SAST): ${esc(fmtDt(c.lastImportAt))}</p>

  <h3 class="sub">2. Day-end (clause 4.5) — Mon–Fri</h3>
  <table class="ams">
    <thead><tr><th class="dark">Status</th><th class="dark">Last run</th><th class="dark">Password risk</th><th class="dark">Task groups</th></tr></thead>
    <tbody>
      <tr>
        <td class="${dayEnd.status === "ran" ? "ok" : dayEnd.status === "failed" || dayEnd.status === "skipped" ? "bad" : "warn"}">${esc(dayEnd.label)}</td>
        <td>${esc(fmtDt(dayEnd.lastRunAt))}</td>
        <td class="${dayEnd.passwordRisk ? "bad" : "ok"}">${dayEnd.passwordRisk ? "Yes — notify RPM" : "Clear"}</td>
        <td>${esc(dayEnd.taskGroups.join(", ") || "—")}</td>
      </tr>
    </tbody>
  </table>
  <p class="muted">${esc(dayEnd.detail)}</p>
  ${dayEnd.passwordRiskNote ? `<p class="muted"><strong>${esc(dayEnd.passwordRiskNote)}</strong></p>` : ""}

  <h3 class="sub">3. Job errors (latest snapshot)</h3>
  <table class="ams">
    <thead><tr><th class="dark">Program / module</th><th class="dark">Errors</th></tr></thead>
    <tbody>
      ${
        topProg.length === 0
          ? `<tr><td colspan="2" class="ok">No job errors on the latest snapshot.</td></tr>`
          : topProg
              .map(
                ([p, n]) =>
                  `<tr><td>${esc(p)}</td><td class="warn" style="text-align:right">${esc(n)}</td></tr>`,
              )
              .join("")
      }
    </tbody>
  </table>
  <p class="muted">Total job errors: ${esc(c.sysproJobErrorCount)}.</p>

  <h3 class="sub">4. FinSight — control accounts (sub-ledger vs GL)</h3>
  <table class="ams">
    <thead><tr><th class="dark">Modules</th><th class="dark">In balance</th><th class="dark">Out of balance</th><th class="dark">OOB lines</th><th class="dark">|Variance|</th></tr></thead>
    <tbody>
      <tr>
        <td>${esc(fs.modules)}</td>
        <td class="ok">${esc(fs.modulesClean)}</td>
        <td class="${fs.modulesOob > 0 ? "bad" : "ok"}">${esc(fs.modulesOob)}</td>
        <td class="${fs.oobLines > 0 ? "bad" : "ok"}">${esc(fs.oobLines)}</td>
        <td style="text-align:right">${esc(zar(fs.absVar))}</td>
      </tr>
    </tbody>
  </table>
  <table class="ams">
    <thead><tr><th class="dark">Module</th><th class="dark">OOB lines</th><th class="dark">|Variance|</th></tr></thead>
    <tbody>
      ${
        oobMods.length === 0
          ? `<tr><td colspan="3" class="ok">All collected modules in balance.</td></tr>`
          : oobMods
              .map(
                (r) =>
                  `<tr><td>${esc(r.balanceTypeName || r.balanceTypeCode)}</td><td class="warn" style="text-align:right">${esc(r.varianceLineCount)}</td><td style="text-align:right">${esc(zar(r.absVariance))}</td></tr>`,
              )
              .join("")
      }
    </tbody>
  </table>
  <p class="muted">Running FinSight is AMS. Interpreting exceptions is billable consulting unless already in the plan.</p>

  <h3 class="sub">5. Operators & security admin (clause 7.4)</h3>
  <table class="ams">
    <thead><tr><th class="dark">Operators</th><th class="dark">Active (≤30d)</th><th class="dark">Amends (90d)</th><th class="dark">Groups</th></tr></thead>
    <tbody>
      <tr>
        <td>${esc(ops.length || c.operatorCount)}</td>
        <td>${esc(c.activeUserCount)}</td>
        <td>${esc(detail.securitySummary?.amendCount90d ?? amends.length)}</td>
        <td>${esc(detail.securitySummary?.distinctGroups ?? "—")}</td>
      </tr>
    </tbody>
  </table>
  <table class="ams">
    <thead><tr><th class="dark">Security task</th><th class="dark">Target from a complete request</th></tr></thead>
    <tbody>
      ${RPM_SECURITY_ADMIN.map((r) => `<tr><td>${esc(r.task)}</td><td>${esc(r.target)}</td></tr>`).join("")}
    </tbody>
  </table>
  ${
    recentAmends.length
      ? `<table class="ams">
    <thead><tr><th class="dark">Recent amends</th><th class="dark">Type</th><th class="dark">When</th><th class="dark">By</th></tr></thead>
    <tbody>
      ${recentAmends
        .map(
          (a) =>
            `<tr><td>${esc(a.operatorCode)}</td><td>${esc(a.amendType)}</td><td>${esc(fmtDt(a.amendDate))}</td><td>${esc(a.changedBy)}</td></tr>`,
        )
        .join("")}
    </tbody>
  </table>`
      : `<p class="muted">No operator amend rows on this snapshot.</p>`
  }

  <h3 class="sub">6. Hotfixes & licence (clause 4.6)</h3>
  <table class="ams">
    <tbody>
      <tr><th>Product</th><td>${esc(license?.productName ?? ver?.productName ?? "—")}</td></tr>
      <tr><th>Version</th><td>${esc(license?.productVersion ?? ver?.productVersion ?? "—")}</td></tr>
      <tr><th>Expiry</th><td>${esc(fmtD(license?.licenseExpiry ?? ver?.licenseExpiry))}</td></tr>
      <tr><th>Hotfixes installed</th><td>${esc(hotfixes.length)}</td></tr>
      <tr><th>Mandatory missing</th><td class="${(gap?.missingMandatory ?? 0) > 0 ? "warn" : "ok"}">${esc(gap?.missingMandatory ?? "—")}</td></tr>
    </tbody>
  </table>

  <h3 class="sub">7. Signed SLA clocks (clause 7.2) — Business Hours</h3>
  <table class="ams">
    <thead><tr><th class="dark">Priority</th><th class="dark">Acknowledge</th><th class="dark">Remote</th><th class="dark">Restore</th></tr></thead>
    <tbody>
      ${RPM_CONTRACT_CLOCKS.map(
        (r) =>
          `<tr><td><strong>${esc(r.priority)}</strong> ${esc(r.name)}</td><td>${esc(r.acknowledge)}</td><td>${esc(r.remote)}</td><td>${esc(r.restore)}</td></tr>`,
      ).join("")}
    </tbody>
  </table>
  <p class="muted">${
    ticketMeasured
      ? `Ticket clocks measured this period: response ${sla?.slaResponsePct ?? "—"}% · restore ${sla?.slaResolvePct ?? "—"}%. ${sla?.note ?? ""}`
      : "Targets from the signed SLA — <strong>not measured</strong> this period. Connect a helpdesk feed before scoring clause 7.2. No 99.5% uptime is claimed."
  }</p>

  <div class="note">
    <strong>Not in this pack (and not in the contract)</strong>
    <ul>
      <li>Cloud Backup (Cove), EPP, Microsoft 365 — operational posture only, clauses 5.1 / 11.2.</li>
      <li>Availability % or invented respond/resolve scores.</li>
      <li>Workstations in any RMM figure.</li>
    </ul>
    <p style="margin:8px 0 0">Print or Save as PDF. Generated ${esc(now)} from live collect.</p>
  </div>
</div>`;

  const text = [
    title,
    `Health ${c.healthRag} · collect ${c.lastImportAt ?? "none"}`,
    `Day-end ${dayEnd.label} · jobs ${c.sysproJobErrorCount} · FinSight OOB ${fs.oobLines}`,
    `SLA clocks: P1 30m / 1 BH / 8 BH — ${ticketMeasured ? "measured" : "not measured"}`,
  ].join("\n");

  return {
    subject: `RPM Assure — Monthly AMS pack — ${c.displayName} — ${dateLabel}`,
    html: shell(title, body, now),
    text,
  };
}


'@)
    }
    [IO.File]::WriteAllText($htmlf, $ht, $Utf8)
    W Green 'inserted monthly AMS HTML builder'
  } else { W DarkGray 'monthly builder already present' }
}

$rb = Join-Path $App 'src\lib\mail\report-build.ts'
if (Test-Path $rb) {
  $rbt = [IO.File]::ReadAllText($rb)
  if (-not $rbt.Contains('buildMonthlyAmsPackHtml')) {
    $rbt = $rbt.Replace('buildDayEndFinSightHtml,', "buildDayEndFinSightHtml,`n  buildMonthlyAmsPackHtml,")
    $rbt = $rbt.Replace(
      'if (format === "ams-monthly") {',
      'if (format === "ams-monthly") { /* monthly-pack */'
    )
    # replace the monthly block body if still using variant monthly
    $rbt = $rbt.Replace(
      @"
  if (format === "ams-monthly") {
    return buildApplicationsAmsHtml({
      customer,
      portfolio,
      variant: "monthly",
    });
  }
"@,
      @"
  if (format === `"ams-monthly`") {
    return buildMonthlyAmsPackHtml({ customer, portfolio });
  }
"@
    )
    # fallback if formatting differs
    if ($rbt.Contains('variant: "monthly"') -and $rbt.Contains('buildMonthlyAmsPackHtml,')) {
      $rbt = $rbt.Replace('variant: "monthly"', 'variant: "full" /* monthly now dedicated */')
    }
    [IO.File]::WriteAllText($rb, $rbt, $Utf8)
    W Green 'wired report-build monthly pack'
  }
}

$sa = Join-Path $App 'src\lib\settings\settings-api.ts'
if (Test-Path $sa) {
  $st = [IO.File]::ReadAllText($sa)
  if (-not $st.Contains('buildMonthlyAmsPackHtml')) {
    $st = $st.Replace('buildDayEndFinSightHtml,', "buildDayEndFinSightHtml,`n  buildMonthlyAmsPackHtml,")
    $st = $st.Replace(
      'if (format === "day-end") return buildDayEndFinSightHtml({ customer, portfolio });',
      "if (format === `"day-end`") return buildDayEndFinSightHtml({ customer, portfolio });`nif (format === `"ams-monthly`") return buildMonthlyAmsPackHtml({ customer, portfolio });"
    )
    [IO.File]::WriteAllText($sa, $st, $Utf8)
    W Green 'wired settings-api monthly pack'
  }
}

W Cyan '=== Restart service ==='
$svc = Get-Service -Name 'RPMAssure-App' -ErrorAction SilentlyContinue
if ($svc) {
  Restart-Service -Name RPMAssure-App -Force
  $up = $false
  for ($i = 1; $i -le 40; $i++) {
    Start-Sleep -Seconds 1
    $l = Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue
    if ($l) { W Green ("LISTENING PID {0}" -f $l[0].OwningProcess); $up = $true; break }
  }
  if (-not $up) { W Yellow 'Service restarted but port not listening yet — wait 10s and hard-refresh.' }
  Get-Service RPMAssure-App | Format-Table Name, Status, StartType -AutoSize
} else {
  W Yellow 'RPMAssure-App service not found — files written; start the app yourself.'
}

W Green '=== Done ==='
W Green 'Hard-refresh. Check: SLA clocks, SYSPRO Day end, Print monthly AMS pack.'
