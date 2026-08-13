import { Download } from "lucide-react";

export function DownloadPackButton({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <a
        href="/downloads/Install-TailAdmin-OneShot.ps1"
        download="Install-TailAdmin-OneShot.ps1"
        className={
          compact
            ? "inline-flex min-h-9 items-center gap-1 rounded-md bg-[#3b82f6] px-2 py-1 text-[11px] font-semibold text-white hover:bg-[#2563eb]"
            : "inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#3b82f6] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#2563eb]"
        }
      >
        <Download className="h-4 w-4 shrink-0" />
        {compact ? "Download one-shot" : "Download TailAdmin one-shot"}
      </a>
      <a
        href="/downloads/RPMAssure-TailAdmin.zip"
        download="RPMAssure-TailAdmin.zip"
        className={
          compact
            ? "inline-flex min-h-9 items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-semibold text-fg"
            : "inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-fg"
        }
      >
        Zip pack
      </a>
    </span>
  );
}
