import { createServerFn } from "@tanstack/react-start";

const GREET = "Hey, my name is Vision! How can I assist you today?";

const FAQ: { keys: string[]; answer: string }[] = [
  {
    keys: ["hello", "hi", "hey", "help", "who are you", "vision"],
    answer: GREET + " I can walk you through SLA import, cover, tickets, RMM, backup, EPP, SYSPRO, and where data lands.",
  },
  {
    keys: ["sla", "signed", "import", "contract", "provisional"],
    answer:
      "Cover is Provisional (orange) until a signed SLA is on file. Open Customer Eco System → SLA → Import Signed SLA. Browse for the PDF or Word file, Scan it, then confirm the signature. Tenant KPI targets only apply after Confirm signed SLA.",
  },
  {
    keys: ["ticket", "freshdesk", "service desk", "incident"],
    answer:
      "RPM Service Desk tickets come from Freshdesk. Map the company, then the scheduled collect (every 15 minutes) loads them. Open / Closed / Resolved sit under Customer Tickets. Every tenant has ticket Cover; an empty pane means no tickets yet, not No Cover.",
  },
  {
    keys: ["iops", "disk", "pulseway"],
    answer:
      "IOPS is not in the RMM REST API. Pulseway Automation must run Pulseway-Collect-DiskIops.ps1 and POST to /api/iops. The Assure agent can also collect IOPS. Recheck only refreshes devices.",
  },
  {
    keys: ["epp", "endpoint", "bitdefender", "scan", "policy"],
    answer:
      "RPM End Point Protection is GravityZone. Collect pulls endpoints, last scan, policies and installed modules. Policies lists modules turned on for this customer. Last scan age is on the EPP overview.",
  },
  {
    keys: ["backup", "cove", "restore", "recovery"],
    answer:
      "RPM Cloud Backup devices come from the backup collect. Recovery test clocks are scored when a last-test time is stored. Partner maps must stamp the right CustomerCode (e.g. BHF not PCNS).",
  },
  {
    keys: ["syspro", "finsight", "job"],
    answer:
      "SYSPRO Landscape needs the Assure agent on the SYSPRO SQL host. It collects companies, build, FinSight, jobs and licence. If companies show 0, the collect did not land rows — check the agent job log on that host.",
  },
  {
    keys: ["cover", "no cover", "rag", "red", "amber"],
    answer:
      "Cover = live rows for that service. RAG is health of those rows (green / amber / red). Off + Cover still shows green glow so the service is on. Ecosystem customise only lists covered items.",
  },
  {
    keys: ["agent", "git", "download", "pack"],
    answer:
      "Agents pull the pack from Assure over HTTPS — no Git on customer hosts. Publish the pack on the app server, then run Deploy-Assure-Agent.ps1 from https://assure.rpmresources.co.za/downloads/.",
  },
  {
    keys: ["csp", "365", "microsoft"],
    answer:
      "Microsoft 365 is tenant posture only — it is never scored on the signed SYSPRO+AMS contract. Collect needs a Csp.Config.<CODE>.ps1 per tenant.",
  },
];

function reply(message: string, path?: string, customer?: string) {
  const q = message.trim().toLowerCase();
  if (!q) return GREET;
  const hit = FAQ.find((f) => f.keys.some((k) => q.includes(k)));
  const where = [customer ? `Customer ${customer}.` : "", path ? `You are on ${path}.` : ""]
    .filter(Boolean)
    .join(" ");
  if (hit) return where ? `${hit.answer}\n\n${where}` : hit.answer;
  return [
    GREET,
    "I did not match a specific topic. Try asking about SLA import, tickets, IOPS, EPP last scan, Cloud Backup, SYSPRO, or agent deploy.",
    where,
  ]
    .filter(Boolean)
    .join(" ");
}

export const askVision = createServerFn({ method: "POST" })
  .validator((data: { message: string; path?: string; customer?: string }) => data)
  .handler(async ({ data }) => {
    const message = String(data.message ?? "").slice(0, 2000);
    return {
      ok: true as const,
      text: reply(message, data.path, data.customer),
    };
  });

export const VISION_GREETING = GREET;
