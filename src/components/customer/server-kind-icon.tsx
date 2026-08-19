import { classifyServerHardware, type ServerHardwareKind } from "@/lib/data/rmm-device-class";

export function ServerKindIcon({
  device,
  size = 36,
  showLabel = false,
}: {
  device: {
    name?: string | null;
    osName?: string | null;
    deviceType?: string | null;
    disks?: { mediaType?: string | null }[] | null;
  };
  size?: number;
  showLabel?: boolean;
}) {
  const kind = classifyServerHardware(device);
  return (
    <span className="inline-flex items-center gap-1.5">
      <ServerKindMark kind={kind} size={size} />
      {showLabel ? (
        <span className="text-[10px] font-extrabold uppercase tracking-wide text-fg">
          {kind === "virtual" ? "Virtual" : kind === "physical" ? "Physical" : "Unknown"}
        </span>
      ) : null}
    </span>
  );
}

export function ServerKindMark({ kind, size = 36 }: { kind: ServerHardwareKind; size?: number }) {
  const label = kind === "virtual" ? "Virtual server" : kind === "physical" ? "Physical server" : "Server type unknown";
  return (
    <span className={`rpma-srv-kind is-${kind}`} title={label} aria-label={label} style={{ width: size, height: size }}>
      {kind === "virtual" ? (
        <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
          <rect x="4" y="26" width="28" height="16" rx="3" fill="#0f766e" />
          <rect x="8" y="30" width="14" height="2.4" rx="1" fill="#ccfbf1" />
          <rect x="8" y="34.5" width="9" height="2.4" rx="1" fill="#99f6e4" />
          <circle cx="27" cy="38" r="1.6" fill="#17c666" />
          <rect x="16" y="8" width="28" height="18" rx="3" fill="#263544" />
          <rect x="20" y="12" width="16" height="2.6" rx="1" fill="#1bb8a6" />
          <rect x="20" y="17.5" width="11" height="2.6" rx="1" fill="#8fce4a" />
          <path d="M8 26l12-6h20" fill="none" stroke="#263544" strokeWidth="1.6" opacity="0.35" />
          <text x="24" y="45" textAnchor="middle" fontSize="5.5" fontWeight="800" fill="#0f766e">
            VM
          </text>
        </svg>
      ) : kind === "physical" ? (
        <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
          <rect x="8" y="5" width="32" height="38" rx="3" fill="#263544" />
          <rect x="12" y="10" width="24" height="7" rx="1.5" fill="#3a4658" />
          <rect x="12" y="20" width="24" height="7" rx="1.5" fill="#3a4658" />
          <rect x="12" y="30" width="24" height="7" rx="1.5" fill="#3a4658" />
          <circle cx="16" cy="13.5" r="1.5" fill="#17c666" />
          <circle cx="16" cy="23.5" r="1.5" fill="#17c666" />
          <circle cx="16" cy="33.5" r="1.5" fill="#ffa21d" />
          <rect x="20" y="12.6" width="12" height="1.8" rx="0.6" fill="#1bb8a6" />
          <rect x="20" y="22.6" width="12" height="1.8" rx="0.6" fill="#1bb8a6" />
          <rect x="20" y="32.6" width="12" height="1.8" rx="0.6" fill="#8fce4a" />
        </svg>
      ) : (
        <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
          <rect x="9" y="10" width="30" height="26" rx="3" fill="#64748b" />
          <rect x="13" y="15" width="22" height="4" rx="1" fill="#e2e8f0" />
          <rect x="13" y="22" width="16" height="4" rx="1" fill="#cbd5e1" />
          <text x="24" y="42" textAnchor="middle" fontSize="5.5" fontWeight="800" fill="#475569">
            ?
          </text>
        </svg>
      )}
    </span>
  );
}

/** Drive type glyph used on Disk Performance. */
export function DriveTypeIcon({
  bus,
  size = 18,
}: {
  bus: string | null | undefined;
  size?: number;
}) {
  const k = String(bus ?? "unknown").toLowerCase();
  const kind = k.includes("nvme")
    ? "nvme"
    : k.includes("sas")
      ? "sas"
      : k.includes("virtual")
        ? "virtual"
        : k.includes("ssd")
          ? "ssd"
          : k.includes("hdd") || k.includes("sata")
            ? "hdd"
            : "unknown";
  const fill =
    kind === "nvme"
      ? "#7c3aed"
      : kind === "sas"
        ? "#2563eb"
        : kind === "ssd"
          ? "#0891b2"
          : kind === "virtual"
            ? "#0d9488"
            : kind === "hdd"
              ? "#64748b"
              : "#94a3b8";
  return (
    <span className="rpma-drive-ico" title={bus || "Drive type"} aria-hidden style={{ width: size, height: size }}>
      {kind === "nvme" ? (
        <svg viewBox="0 0 24 24" width={size} height={size}>
          <rect x="2" y="7" width="20" height="10" rx="2" fill={fill} />
          <rect x="4" y="9.5" width="10" height="2" rx="1" fill="#ede9fe" />
          <rect x="4" y="13" width="6" height="1.6" rx="0.8" fill="#c4b5fd" />
          <circle cx="18" cy="12" r="1.6" fill="#fde68a" />
        </svg>
      ) : kind === "ssd" || kind === "sas" ? (
        <svg viewBox="0 0 24 24" width={size} height={size}>
          <rect x="3" y="5" width="18" height="14" rx="2" fill={fill} />
          <rect x="6" y="8" width="12" height="2" rx="1" fill="#e0f2fe" />
          <rect x="6" y="12" width="8" height="2" rx="1" fill="#bae6fd" />
          <circle cx="16.5" cy="15.5" r="1.4" fill="#17c666" />
        </svg>
      ) : kind === "virtual" ? (
        <svg viewBox="0 0 24 24" width={size} height={size}>
          <rect x="4" y="4" width="16" height="10" rx="2" fill="#263544" />
          <rect x="2" y="14" width="14" height="7" rx="1.5" fill={fill} />
          <rect x="7" y="7" width="8" height="1.6" rx="0.8" fill="#1bb8a6" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width={size} height={size}>
          <ellipse cx="12" cy="7" rx="8" ry="3.2" fill={fill} />
          <path d="M4 7v10c0 1.8 3.6 3.2 8 3.2s8-1.4 8-3.2V7" fill={fill} opacity="0.92" />
          <ellipse cx="12" cy="7" rx="8" ry="3.2" fill="#cbd5e1" opacity="0.45" />
          <path d="M4 12c0 1.8 3.6 3.2 8 3.2s8-1.4 8-3.2" fill="none" stroke="#e2e8f0" strokeWidth="1.2" />
        </svg>
      )}
    </span>
  );
}
