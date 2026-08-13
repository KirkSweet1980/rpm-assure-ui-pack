import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { RequireAuth } from "@/components/portfolio/require-auth";
import { AppShell } from "@/components/portfolio/app-shell";

export const Route = createFileRoute("/pack")({
  component: PackPage,
});

function PackPage() {
  return (
    <RequireAuth>
      <AppShell
        title="Install pack"
        subtitle="Click a button. The file saves to your Downloads folder."
      >
        <div className="mx-auto max-w-xl space-y-4 py-6">
          <a
            href="/downloads/RPMAssure-TailAdmin.zip"
            download="RPMAssure-TailAdmin.zip"
            className="flex min-h-16 items-center justify-center gap-3 rounded-2xl bg-[#3b82f6] px-6 py-5 text-lg font-bold text-white shadow-md hover:bg-[#2563eb]"
          >
            <Download className="h-6 w-6" />
            Download ZIP
          </a>
          <a
            href="/downloads/Install-TailAdmin-OneShot.ps1"
            download="Install-TailAdmin-OneShot.ps1"
            className="flex min-h-14 items-center justify-center gap-3 rounded-2xl border-2 border-[var(--color-border-strong)] bg-[var(--color-surface)] px-6 py-4 text-base font-bold text-fg hover:border-[#3b82f6]"
          >
            <Download className="h-5 w-5" />
            Download one-shot script
          </a>
          <p className="text-sm text-muted">
            After the ZIP downloads, extract it, then run the one-shot as
            Administrator. The one-shot already contains the pack — you can
            run that file alone from any folder.
          </p>
        </div>
      </AppShell>
    </RequireAuth>
  );
}
