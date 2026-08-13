/**
 * Classify Pulseway devices as server vs workstation for UI modules and SLA.
 */

export type RmmDeviceClass = "server" | "workstation" | "other";

export function classifyRmmDevice(d: {
  deviceType?: string | null;
  osName?: string | null;
  name?: string | null;
}): RmmDeviceClass {
  const type = (d.deviceType || "").toLowerCase();
  const os = (d.osName || "").toLowerCase();
  const name = (d.name || "").toLowerCase();
  const blob = `${type} ${os} ${name}`;

  // Explicit Pulseway types win
  if (type === "server" || type.includes("server") || type.includes("domain controller")) {
    return "server";
  }
  if (
    type === "workstation" ||
    type.includes("workstation") ||
    type.includes("desktop") ||
    type.includes("laptop") ||
    type.includes("notebook")
  ) {
    return "workstation";
  }

  // OS / name heuristics
  if (
    blob.includes("windows server") ||
    blob.includes("server 201") ||
    blob.includes("server 202") ||
    blob.includes("domain controller") ||
    /\b(hyper-v|esxi|vcenter|sql|dc\d*|prod|srv)\b/.test(blob)
  ) {
    return "server";
  }

  if (
    blob.includes("windows 11") ||
    blob.includes("windows 10") ||
    blob.includes("windows 8") ||
    blob.includes("windows 7") ||
    blob.includes("macos") ||
    blob.includes("mac os") ||
    blob.includes("laptop") ||
    blob.includes("notebook") ||
    blob.includes("surface") ||
    blob.includes("desktop") ||
    blob.includes("pro (") ||
    blob.includes("home (") ||
    blob.includes("business (")
  ) {
    return "workstation";
  }

  // Generic "Windows" type without Server usually means client
  if (type === "windows" || type === "pc" || type.includes("computer")) {
    if (!blob.includes("server")) return "workstation";
  }

  return "other";
}

export function isRmmServer(d: {
  deviceType?: string | null;
  osName?: string | null;
  name?: string | null;
}): boolean {
  return classifyRmmDevice(d) === "server";
}

export function isRmmWorkstation(d: {
  deviceType?: string | null;
  osName?: string | null;
  name?: string | null;
}): boolean {
  return classifyRmmDevice(d) === "workstation";
}
