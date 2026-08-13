import { fetchLivePortfolio } from "@/lib/data/live-portfolio";
import { getSmtpConfig } from "@/lib/settings/settings-store";
import { sendMailWithSmtp } from "@/lib/mail/send";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, String.fromCharCode(38) + "amp;")
    .replace(/</g, String.fromCharCode(38) + "lt;")
    .replace(/>/g, String.fromCharCode(38) + "gt;")
    .replace(/"/g, String.fromCharCode(38) + "quot;");
}

export async function buildWeeklyReportEmail(): Promise<{
  subject: string;
  text: string;
  html: string;
} | null> {
  const portfolio = await fetchLivePortfolio();
  if (!portfolio) return null;

  const rows = (portfolio.rows ?? portfolio.customers ?? []);
  const summary = portfolio.summary;
  const reds = rows.filter((r) => r.healthRag === "Red");
  const ambers = rows.filter((r) => r.healthRag === "Amber");
  const periodEnd = new Date();

  const boards = portfolio.exco?.boards ?? [];
  const withMand = boards.filter((b) => (b.missingMandatoryHotfixes ?? 0) > 0);

  const hfLines: string[] = [
    "",
    "Mandatory hotfix gaps (version-scoped, waivers excluded):",
  ];
  if (withMand.length === 0) {
    hfLines.push("  (none open)");
  } else {
    for (const b of withMand) {
      hfLines.push(
        "  " +
          b.displayName +
          "\t" +
          (b.sysproVersion ?? "?") +
          "\tmissing mand. " +
          String(b.missingMandatoryHotfixes),
      );
    }
  }

  const hfHtml =
    "<h3>Mandatory hotfix gaps</h3>" +
    '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">' +
    "<thead><tr><th>Customer</th><th>Version</th><th>Missing mand.</th><th>Installed HF</th></tr></thead><tbody>" +
    (withMand.length
      ? withMand
          .map(
            (b) =>
              "<tr><td>" +
              escapeHtml(b.displayName) +
              "</td><td>" +
              escapeHtml(b.sysproVersion ?? "—") +
              "</td><td>" +
              String(b.missingMandatoryHotfixes ?? 0) +
              "</td><td>" +
              String(b.installedHotfixCount ?? 0) +
              "</td></tr>",
          )
          .join("")
      : "<tr><td colspan=4>None open</td></tr>") +
    "</tbody></table>";

  const subject =
    "RPM Assure weekly - " +
    reds.length +
    " Red, " +
    ambers.length +
    " Amber (" +
    rows.length +
    " customers)";

  const lines: string[] = [
    "RPM Assure - Weekly assurance pack",
    "Period: last 7 days ending " + periodEnd.toISOString().slice(0, 10),
    "",
    "Customers: " + String(summary.totalCustomers),
    "Red: " +
      reds.length +
      "  Amber: " +
      ambers.length +
      "  Green: " +
      String(summary.green ?? 0),
    "",
    "Attention list:",
  ];

  for (const r of [...reds, ...ambers]) {
    lines.push(
      "  [" +
        r.healthRag +
        "] " +
        r.displayName +
        " - " +
        (r.healthSummary ?? "") +
        " (jobs " +
        r.sysproJobErrorCount +
        ", FinSight " +
        r.sysproDtrVarianceLines +
        ")",
    );
  }
  if (reds.length + ambers.length === 0) {
    lines.push("  (none - all Green or no data)");
  }

  lines.push(...hfLines);

  lines.push("", "Full portfolio:");
  for (const r of rows) {
    lines.push(
      "  " +
        r.displayName +
        "\t" +
        r.healthRag +
        "\tops " +
        r.operatorCount +
        "\tactive " +
        r.activeUserCount +
        "\tjobs " +
        r.sysproJobErrorCount +
        "\tOut of Balance " +
        r.sysproDtrVarianceLines,
    );
  }
  lines.push("", "Open Assurance Pulse for detail. This is an automated digest.");

  const text = lines.join("\n");

  const attRows = [...reds, ...ambers]
    .map(
      (r) =>
        "<tr><td>" +
        escapeHtml(r.displayName) +
        "</td><td>" +
        escapeHtml(r.healthRag) +
        "</td><td>" +
        escapeHtml(r.healthSummary ?? "") +
        "</td><td>" +
        r.sysproJobErrorCount +
        "</td><td>" +
        r.sysproDtrVarianceLines +
        "</td></tr>",
    )
    .join("");

  const allRows = rows
    .map(
      (r) =>
        "<tr><td>" +
        escapeHtml(r.displayName) +
        "</td><td>" +
        escapeHtml(r.healthRag) +
        "</td><td>" +
        r.operatorCount +
        "</td><td>" +
        r.activeUserCount +
        "</td><td>" +
        r.sysproJobErrorCount +
        "</td><td>" +
        r.sysproDtrVarianceLines +
        "</td></tr>",
    )
    .join("");

  const html =
    '<!DOCTYPE html><html><body style="font-family:Segoe UI,sans-serif;font-size:14px;color:#111">' +
    "<h2>RPM Assure - Weekly assurance pack</h2>" +
    "<p>Period: last 7 days - generated " +
    escapeHtml(periodEnd.toISOString()) +
    "</p>" +
    "<ul><li>Customers: <b>" +
    String(summary.totalCustomers) +
    "</b></li><li>Red: <b>" +
    String(reds.length) +
    "</b> - Amber: <b>" +
    String(ambers.length) +
    "</b> - Green: <b>" +
    String(summary.green ?? 0) +
    "</b></li></ul>" +
    "<h3>Attention</h3>" +
    '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">' +
    "<thead><tr><th>Customer</th><th>RAG</th><th>Summary</th><th>Jobs</th><th>Out of Balance</th></tr></thead>" +
    "<tbody>" +
    (attRows || "<tr><td colspan=5>None</td></tr>") +
    "</tbody></table>" +
    hfHtml +
    "<h3>Portfolio</h3>" +
    '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">' +
    "<thead><tr><th>Customer</th><th>RAG</th><th>Ops</th><th>Active</th><th>Jobs</th><th>Out of Balance</th></tr></thead>" +
    "<tbody>" +
    allRows +
    "</tbody></table>" +
    '<p style="color:#666;font-size:12px">Automated digest from RPM Assure. Mandatory HF gaps exclude version-out-of-scope and waivers.</p>' +
    "</body></html>";

  return { subject, text, html };
}

export async function sendWeeklyReportEmail(overrideTo?: string): Promise<{
  ok: boolean;
  error?: string;
  messageId?: string;
  recipients?: string;
}> {
  const smtp = getSmtpConfig();
  const built = await buildWeeklyReportEmail();
  if (!built) {
    return { ok: false, error: "Could not build portfolio (SQL/demo failed)." };
  }

  const recipients =
    overrideTo?.trim() || smtp.reportTo?.trim() || smtp.fromEmail?.trim() || "";

  if (!recipients) {
    return {
      ok: false,
      error: "No report recipients (set Report To or From email).",
    };
  }

  try {
    const result = await sendMailWithSmtp(smtp, {
      to: recipients,
      subject: built.subject,
      text: built.text,
      html: built.html,
    });
    if (!result.ok) {
      return { ok: false, error: result.error, recipients };
    }
    return {
      ok: true,
      messageId: result.messageId,
      recipients,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      recipients,
    };
  }
}
