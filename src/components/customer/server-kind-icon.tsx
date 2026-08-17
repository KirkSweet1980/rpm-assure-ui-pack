import { classifyServerHardware, type ServerHardwareKind } from "@/lib/data/rmm-device-class";

export function ServerKindIcon({
  device,
  size = 28,
}: {
  device: {
    name?: string | null;
    osName?: string | null;
    deviceType?: string | null;
    disks?: { mediaType?: string | null }[] | null;
  };
  size?: number;
}) {
  const kind = classifyServerHardware(device);
  return <ServerKindMark kind={kind} size={size} />;
}

export function ServerKindMark({ kind, size = 28 }: { kind: ServerHardwareKind; size?: number }) {
  const label = kind === "virtual" ? "Virtual server" : kind === "physical" ? "Physical server" : "Server type unknown";
  return (
    <span className={`rpma-srv-kind is-${kind}`} title={label} aria-label={label} style={{ width: size, height: size }}>
      {kind === "virtual" ? (
        <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden>
          <rect x="3" y="14" width="18" height="12" rx="2" fill="#1bb8a6" />
          <rect x="6" y="17" width="12" height="2" rx="1" fill="#042f2e" opacity="0.35" />
          <rect x="6" y="21" width="8" height="2" rx="1" fill="#042f2e" opacity="0.35" />
          <rect x="11" y="6" width="18" height="12" rx="2" fill="#263544" />
          <rect x="14" y="9" width="12" height="2" rx="1" fill="#1bb8a6" />
          <rect x="14" y="13" width="8" height="2" rx="1" fill="#8fce4a" />
          <circle cx="25" cy="16" r="1.2" fill="#17c666" />
        </svg>
      ) : kind === "physical" ? (
        <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden>
          <rect x="5" y="4" width="22" height="24" rx="2.5" fill="#263544" />
          <rect x="8" y="8" width="16" height="4" rx="1" fill="#3a4658" />
          <rect x="8" y="14" width="16" height="4" rx="1" fill="#3a4658" />
          <rect x="8" y="20" width="16" height="4" rx="1" fill="#3a4658" />
          <circle cx="11" cy="10" r="1" fill="#17c666" />
          <circle cx="11" cy="16" r="1" fill="#17c666" />
          <circle cx="11" cy="22" r="1" fill="#ffa21d" />
          <rect x="14" y="9.4" width="8" height="1.2" rx="0.5" fill="#1bb8a6" />
          <rect x="14" y="15.4" width="8" height="1.2" rx="0.5" fill="#1bb8a6" />
        </svg>
      ) : (
        <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden>
          <rect x="6" y="7" width="20" height="18" rx="2" fill="#5b6b79" />
          <rect x="9" y="11" width="14" height="3" rx="1" fill="#d5dde6" />
          <rect x="9" y="17" width="10" height="3" rx="1" fill="#d5dde6" />
        </svg>
      )}
    </span>
  );
}
