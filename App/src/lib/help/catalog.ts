/** In-app Help catalogue. Customer-facing names only. Not a ticketing system. */

export type HelpTopic = {
  id: string;
  title: string;
  group: string;
  summary: string;
  body: string[];
};

export const HELP_GROUPS = [
  "Getting Started",
  "Eco-System",
  "SYSPRO",
  "RPM Remote Management",
  "RPM Cloud Backup",
  "RPM End Point Protection",
  "Microsoft 365",
  "Service Desk",
  "Reporting",
  "Configuration",
  "Agent Status",
  "RAG / Cover / SLA",
  "Troubleshooting",
] as const;

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: "overview",
    title: "What RPM Assure is",
    group: "Getting Started",
    summary: "Monitoring and operational intelligence for RPM-managed customers — not a ticketing system.",
    body: [
      "RPM Assure shows which services are on cover for each customer and the live health of those services. It is not a place to log, assign, or close tickets.",
      "Each tenant is identified by CustomerCode. Open a customer from Eco-System, then use the service rail and module rail to work that tenant.",
      "Header modes: Eco-System, Reporting, Configuration, and Help. They are areas of the same application, not separate products.",
    ],
  },
  {
    id: "navigation",
    title: "How to move around",
    group: "Getting Started",
    summary: "Header modes, customer switcher, and the three-pane tenant workspace.",
    body: [
      "Eco-System is the portfolio. The customer switcher opens a tenant. Reporting builds packs. Configuration is platform settings. Help is this catalogue.",
      "Inside a customer: left rail is RPM Services, middle rail is RPM Service Modules, canvas is the selected page. A service with No Cover stays on the rail so the gap is visible.",
    ],
  },
  {
    id: "eco",
    title: "Customer Eco-System",
    group: "Eco-System",
    summary: "Tenant home: cover, estate, and who may open this customer.",
    body: [
      "The Eco-System page lists customers. Opening one shows that tenant’s services, devices, and cover.",
      "Tenant access follows CustomerCode. Platform administrators can open every tenant. Other roles see only assigned codes.",
    ],
  },
  {
    id: "syspro",
    title: "SYSPRO",
    group: "SYSPRO",
    summary: "Jobs, finance modules, operators, licence, SQL, and health when SYSPRO is on cover.",
    body: [
      "SYSPRO modules stay on the rail even when Cover is off. No Cover is grey and is not scored.",
      "Job Logging is the SYSPRO job queue. Finance Modules (FinSight / DTR) show out-of-balance lines. Operators, licence, hotfixes, day-end, security, and SQL are inventory for the same landscape.",
    ],
  },
  {
    id: "rmm",
    title: "RPM Remote Management",
    group: "RPM Remote Management",
    summary: "Servers, workstations, patch, disk, alerts, and Windows events.",
    body: [
      "RPM Remote Management is the customer-facing name for the remote-management service. Servers and workstations are classified from the mapped provider estate.",
      "Offline servers are live status. They are not an SLA miss unless a valid external ticket is linked and SLA is armed. Patch Compliance and Disk Performance come from collect jobs and the Edge agent.",
    ],
  },
  {
    id: "cove",
    title: "RPM Cloud Backup",
    group: "RPM Cloud Backup",
    summary: "Backup agents, recovery testing, and retention.",
    body: [
      "RPM Cloud Backup lists backup agents mapped to the customer. Recovery Testing and retention are the last successful collect for that service.",
      "No Cover stays visible and grey. Backup health is posture for this service — it does not open an external ticket by itself.",
    ],
  },
  {
    id: "epp",
    title: "RPM End Point Protection",
    group: "RPM End Point Protection",
    summary: "Endpoints, policies, incidents, and quarantine.",
    body: [
      "RPM End Point Protection lists endpoints mapped to the customer. Infected or unmanaged devices can raise RAG when the service is on cover.",
      "Incidents and quarantine are the last collect. This workspace monitors protection posture; it does not replace the provider console.",
    ],
  },
  {
    id: "m365",
    title: "Microsoft 365",
    group: "Microsoft 365",
    summary: "Users, licences, MFA, Secure Score, and admins — posture, not RPM SLA.",
    body: [
      "Microsoft 365 stays Green while the tenant is on cover until a signed RPM SLA exists for this service. Do not treat the vendor platform SLA as RPM’s SLA.",
      "Secure Score, MFA, global admins, and licence stats are visibility. They do not start an RPM SLA clock.",
    ],
  },
  {
    id: "tickets",
    title: "Service Desk",
    group: "Service Desk",
    summary: "External ticket information for the customer. RPM Assure is not the ticketing system.",
    body: [
      "Service Desk shows tickets from the mapped external service desk, grouped as open, resolved, and closed.",
      "RPM Assure does not create, assign, or close those tickets from this workspace. External ticket creation is currently disarmed.",
    ],
  },
  {
    id: "reporting",
    title: "Reporting",
    group: "Reporting",
    summary: "Customer and estate packs from production-authoritative data.",
    body: [
      "Reporting builds day-end, period, AMS, and estate packs for the selected customer. It is a header mode, not a separate application.",
      "Shadow SLA figures, if shown, are labelled as not contractual. They do not replace signed SLA reporting.",
    ],
  },
  {
    id: "config",
    title: "Configuration",
    group: "Configuration",
    summary: "Platform settings: infrastructure, integrations, users, UI, and agents.",
    body: [
      "Configuration is for authorised RPM staff. It does not change customer Cover by painting a Green lamp on a menu item.",
      "Agent Fleet is under Configuration → Agents. Application release and agent release stay separate: changing the application does not publish an agent version.",
    ],
  },
  {
    id: "users",
    title: "Users and tenant access",
    group: "Configuration",
    summary: "Role plus CustomerCode grants. Shown on each tenant’s Eco-System page.",
    body: [
      "Platform Admin sees every customer. Other roles see only assigned CustomerCodes.",
      "Assign access under Configuration → Users. The tenant Eco-System page lists who may open that customer.",
    ],
  },
  {
    id: "email",
    title: "Email and SMTP",
    group: "Configuration",
    summary: "Outbound mail for reports. Ticket automation is not armed.",
    body: [
      "SMTP is used for report delivery. A test send confirms the mailbox path.",
      "Storing SMTP does not create external tickets. Ticket automation remains disarmed.",
    ],
  },
  {
    id: "agents",
    title: "Agent Status",
    group: "Agent Status",
    summary: "Heartbeat and sync are separate. App release is not agent release.",
    body: [
      "Heartbeat is the last successful contact. Sync is the last collection job. A failed job is not the same as disconnected.",
      "Install with the customer’s CustomerCode. The agent updates only when the published agent version is promoted. Help does not publish agents.",
    ],
  },
  {
    id: "cover",
    title: "Cover and No Cover",
    group: "RAG / Cover / SLA",
    summary: "AmsConfig false is hard Off. No Cover stays on the menu and is never Green.",
    body: [
      "Cover comes from AmsConfig for that customer and service. Cover=false is No Cover: the service is not scored.",
      "No Cover remains listed so the gap is visible. The status disc is grey / Off. It must never appear Green.",
    ],
  },
  {
    id: "rag",
    title: "RAG lights",
    group: "RAG / Cover / SLA",
    summary: "Green, Amber, and Red are health. Off is No Cover. Only Red flashes.",
    body: [
      "RAG is monitored health or posture for a covered service. Menu selection is not RAG.",
      "Green and Amber stay still. Red may flash. Off / No Cover is a static grey disc — never the Green asset.",
    ],
  },
  {
    id: "sla",
    title: "SLA clocks",
    group: "RAG / Cover / SLA",
    summary: "An SLA clock starts only when Amber or Red, a valid external ticket is linked, and SLA is armed.",
    body: [
      "RPM Assure is not a ticketing system. SLA is evaluated from a linked external ticket, not from a lamp alone.",
      "A clock may start only when all of these hold: the monitored condition is Amber or Red; a valid external ticket is linked; and SLA is armed. SLA is currently disarmed, so no contractual clock starts from this application.",
      "Microsoft 365 remains Green until a signed RPM SLA exists for that service.",
    ],
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    group: "Troubleshooting",
    summary: "Common read-outs: No Cover, Off disc, empty modules, stale collect.",
    body: [
      "If a service is grey and labelled No Cover, it is not in AmsConfig for this CustomerCode. Mapping leftover rows does not turn it Green.",
      "If Agent Status shows a failed sync but a recent heartbeat, the host is reachable and the job needs review — it is not automatically offline.",
      "If Service Desk is empty, there is no mapped external ticket feed for that customer. That does not mean Assure should create a ticket.",
    ],
  },
];

export function helpTopic(id: string): HelpTopic | undefined {
  return HELP_TOPICS.find((t) => t.id === id);
}

export function helpTopicsInGroup(group: string): HelpTopic[] {
  return HELP_TOPICS.filter((t) => t.group === group);
}