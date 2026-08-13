import { useMemo, useState } from "react";
import { Cloud, Database, Mail, Server, Shield } from "lucide-react";
import { ListPanel, ListRow } from "@/components/nav/list-row";
import {
  filterMasterCustomers,
  useCustomerList,
  type MasterCustomer,
} from "@/lib/nav/customer-list-context";
import type { CustomerCover, HealthRag } from "@/lib/data/types";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const COVER_KEYS: { key: keyof CustomerCover; label: string; icon: LucideIcon }[] = [
  { key: "syspro", label: "SYSPRO", icon: Database },
  { key: "rmm", label: "RMM", icon: Server },
  { key: "cove", label: "Backup", icon: Cloud },
  { key: "epp", label: "EPP", icon: Shield },
  { key: "csp", label: "M365", icon: Mail },
];

function healthDot(rag: HealthRag) {
  if (rag === "Green") return "is-green";
  if (rag === "Red") return "is-red";
  return "is-amber";
}

function CoverGlyphs({ cover }: { cover?: CustomerCover }) {
  return (
    <span className="rpma-d3-cover-glyphs">
      {COVER_KEYS.map(({ key, label, icon: Icon }) => {
        const on = cover?.[key] === true;
        return (
          <span key={key} title={on ? `${label}: Cover` : `${label}: No cover`}>
            <Icon
              className={cn("rpma-d3-cover-ico", on && "is-on")}
              aria-label={on ? `${label} cover` : `${label} no cover`}
            />
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
