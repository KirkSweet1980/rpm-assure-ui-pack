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
  // Unclassified devices still belong on the workstation list so nothing disappears
  return classifyRmmDevice(d) !== "server";
}

export type ServerHardwareKind = "virtual" | "physical" | "unknown";

function blobOf(d: {
  name?: string | null;
  osName?: string | null;
  deviceType?: string | null;
  disks?: { mediaType?: string | null }[] | null;
}): { name: string; os: string; type: string; media: string; disks: { mediaType?: string | null }[] } {
  const disks = d.disks ?? [];
  return {
    name: (d.name || "").toLowerCase(),
    os: (d.osName || "").toLowerCase(),
    type: (d.deviceType || "").toLowerCase(),
    media: disks.map((x) => x.mediaType || "").join(" ").toLowerCase(),
    disks,
  };
}

export function classifyServerHardware(d: {
  name?: string | null;
  osName?: string | null;
  deviceType?: string | null;
  disks?: { mediaType?: string | null }[] | null;
}): ServerHardwareKind {
  const { name, os, type, media, disks } = blobOf(d);
  const compact = name.replace(/[-_\s]/g, "");

  // Hypervisor / host boxes are physical machines
  if (
    /hvhost|hyperv|esxi|vcenter|proxmox|xenhost/.test(compact) &&
    !/guest|virtual machine/.test(`${os} ${media}`)
  ) {
    return "physical";
  }

  // Disk media from IOPS / Pulseway is the strongest guest signal
  if (
    /msft virtual|microsoft virtual|virtual disk|virtual hd|vmware virtual|pvscsi|vmdk|vhdx|\bvhd\b|hyper-v virtual/.test(
      media,
    )
  ) {
    return "virtual";
  }
  if (disks.length > 0 && disks.every((x) => /virtual/i.test(x.mediaType || ""))) {
    return "virtual";
  }

  if (
    /vmware virtual platform|virtual machine|hyper-v guest|kvm|qemu|xen|virtualbox/.test(
      `${os} ${type} ${media}`,
    )
  ) {
    return "virtual";
  }

  if (
    /proliant|poweredge|thinksystem|supermicro|optiplex|precision|idrac|\bilo\b|\bperc\b|\braid\b/.test(
      `${name} ${os} ${media}`,
    )
  ) {
    return "physical";
  }

  if (
    disks.some((x) => /ssd|nvme|sas|sata|hdd|solid state|fixed hard/i.test(x.mediaType || "")) &&
    !/virtual/i.test(media)
  ) {
    return "physical";
  }

  return "unknown";
}
