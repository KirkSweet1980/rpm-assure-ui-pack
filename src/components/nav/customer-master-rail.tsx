import { useMemo, useState } from "react";
import { ListPanel, ListRow } from "@/components/nav/list-row";
import {
  filterMasterCustomers,
  useCustomerList,
  type MasterCustomer,
} from "@/lib/nav/customer-list-context";
import type { CustomerCover, HealthRag } from "@/lib/data/types";
import { cn } from "@/lib/utils";

const COVER_KEYS: { key: keyof CustomerCover; label: string }[] = [
  { key: "syspro", label: "S" },
  { key: "rmm", label: "R" },
  { key: "cove", label: "B" },
  { key: "epp", label: "E" },
  { key: "csp", label: "M" },
];

function healthDot(rag: HealthRag) {
  if (rag === "Green") return "is-green";
  if (rag === "Red") return "is-red";
  return "is-amber";
}

function CoverGlyphs({ cover }: { cover?: CustomerCover }) {
  return (
    <span className="rpma-d3-cover-glyphs" aria-hidden>
      {COVER_KEYS.map(({ key, label }) => {
        const on = cover?.[key] === true;
        return (
          <span
            key={key}
            className={cn("rpma-d3-cover-glyph", on && "is-on")}
            title={on ? `${key}: Cover` : `${key}: No Cover`}
          >
            {label}
          </span>
        );
      })}
    </span>
  );
}

function Row({ c, active }: { c: MasterCustomer; active: boolean }) {
  return (
    <ListRow
      href={`/customers/${encodeURIComponent(c.code)}`}
      active={active}
      title={c.name}
      lead={<span className={cn("rpma-list-dot", healthDot(c.healthRag))} />}
      meta={
        <>
          <span className="font-mono">{c.code}</span>
          {c.opsAgeLabel ? <span> · {c.opsAgeLabel}</span> : null}
        </>
      }
      trail={<CoverGlyphs cover={c.cover} />}
    />
  );
}

export function CustomerMasterRail({ currentCode }: { currentCode: string }) {
  const { customers, loading } = useCustomerList();
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () => filterMasterCustomers(customers, q),
    [customers, q],
  );
  const cur = currentCode.toUpperCase();

  return (
    <ListPanel
      title="Customers"
      count={customers.length}
      query={q}
      onQuery={setQ}
      placeholder="Search customers…"
    >
      {loading && customers.length === 0 ? (
        <p className="rpma-list-empty">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="rpma-list-empty">No matches.</p>
      ) : (
        filtered.map((c) => (
          <Row key={c.code} c={c} active={c.code.toUpperCase() === cur} />
        ))
      )}
    </ListPanel>
  );
}
