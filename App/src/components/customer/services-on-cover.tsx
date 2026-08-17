import { NoCover } from "@/components/ui/no-cover";
import type { CustomerCover } from "@/lib/data/cover";
import { useUiLabels } from "@/lib/settings/use-ui-labels";

/**
 * Single cover strip for all customer pages — must not sit under sticky pillars.
 * Labels from Settings → Labels.
 */
export function ServicesOnCoverStrip({
  cover,
}: {
  cover?: CustomerCover | null;
}) {
  const { labels } = useUiLabels();
  const c = cover ?? {
    syspro: false,
    rmm: false,
    cove: false,
    epp: false,
    csp: false,
    tickets: false,
  };

  return (
    <div
      className="rpma-cover-strip flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-xl border border-border bg-surface px-3 py-2.5 text-[12px]"
      aria-label={labels.servicesOnCover}
    >
      <span className="shrink-0 font-semibold text-fg">{labels.servicesOnCover}</span>
      <CoverChip
        on={Boolean(c.syspro)}
        label={labels.syspro}
        noCover={labels.noCover}
        coverOn={labels.coverOn}
        tip={`${labels.syspro} not in scope for this customer`}
      />
      <span className="hidden text-subtle sm:inline" aria-hidden>
        ·
      </span>
      <CoverChip
        on={Boolean(c.rmm)}
        label={labels.rmm}
        noCover={labels.noCover}
        coverOn={labels.coverOn}
        tip={`${labels.rmm} not in scope for this customer`}
      />
      <span className="hidden text-subtle sm:inline" aria-hidden>
        ·
      </span>
      <CoverChip
        on={Boolean(c.cove)}
        label={labels.cove}
        noCover={labels.noCover}
        coverOn={labels.coverOn}
        tip={`${labels.cove} not in scope for this customer`}
      />
      <span className="hidden text-subtle sm:inline" aria-hidden>
        ·
      </span>
      <CoverChip
        on={Boolean(c.epp)}
        label={labels.epp}
        noCover={labels.noCover}
        coverOn={labels.coverOn}
        tip={`${labels.epp} not in scope for this customer`}
      />
      <span className="hidden text-subtle sm:inline" aria-hidden>
        ·
      </span>
      <CoverChip
        on={Boolean(c.csp)}
        label={labels.csp}
        noCover={labels.noCover}
        coverOn={labels.coverOn}
        tip={`${labels.csp} not in scope for this customer`}
      />
      <span className="hidden text-subtle sm:inline" aria-hidden>
        ·
      </span>
      <CoverChip
        on={Boolean(c.tickets)}
        label={labels.tickets}
        noCover={labels.noCover}
        coverOn={labels.coverOn}
        tip={`${labels.tickets} not in scope for this customer`}
      />
    </div>
  );
}

function CoverChip({
  on,
  label,
  tip,
  noCover,
  coverOn,
}: {
  on: boolean;
  label: string;
  tip: string;
  noCover: string;
  coverOn: string;
}) {
  if (on) {
    return (
      <span className="inline-flex items-center gap-1">
        <span className="rounded-md bg-rag-green-bg px-2 py-0.5 font-medium text-rag-green">
          {label}
        </span>
        <span className="text-[10px] font-extrabold uppercase tracking-wide text-rag-green">
          {coverOn}
        </span>
      </span>
    );
  }
  return (
    <span title={tip} className="inline-flex items-center gap-1">
      <span className="text-muted">{label}</span>
      <NoCover text={noCover} />
    </span>
  );
}
