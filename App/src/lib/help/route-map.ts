/** Central path → Help topic. Keep route checks here, not in pages. */

export function helpTopicIdForPath(pathname: string): string {
  const path = String(pathname ?? "").replace(/\/$/, "") || "/";

  if (path === "/help" || path === "/") return "overview";
  if (path.startsWith("/help/")) {
    const id = path.slice("/help/".length).split("/")[0];
    return id || "overview";
  }

  if (path === "/reports" || path.startsWith("/reports/")) return "reporting";
  if (path === "/settings/agents" || path.startsWith("/settings/agents/")) return "agents";
  if (path === "/settings" || path.startsWith("/settings/")) return "config";

  const cust = path.match(/^\/customers\/[^/]+(?:\/(.*))?$/);
  if (cust) {
    const rest = cust[1] ?? "";
    if (rest === "syspro" || rest.startsWith("syspro/")) return "syspro";
    if (rest === "rmm" || rest.startsWith("rmm/")) return "rmm";
    if (rest === "cove" || rest.startsWith("cove/")) return "cove";
    if (rest === "epp" || rest.startsWith("epp/")) return "epp";
    if (rest === "csp" || rest.startsWith("csp/")) return "m365";
    if (rest === "tickets" || rest.startsWith("tickets/")) return "tickets";
    return "eco";
  }

  return "overview";
}

export function helpHrefForPath(pathname: string): string {
  const path = String(pathname ?? "").replace(/\/$/, "") || "/";
  if (path === "/help" || path.startsWith("/help/")) return "/help";
  return `/help/${helpTopicIdForPath(path)}`;
}