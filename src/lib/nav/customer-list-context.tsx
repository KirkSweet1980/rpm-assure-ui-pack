import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { CustomerCover, HealthRag } from "@/lib/data/types";

export type MasterCustomer = {
  code: string;
  name: string;
  healthRag: HealthRag;
  needsAttention?: boolean;
  collectFresh?: boolean;
  cover?: CustomerCover;
  opsAgeLabel?: string | null;
};

type CustomerListContextValue = {
  customers: MasterCustomer[];
  setCustomers: (rows: MasterCustomer[]) => void;
  loading: boolean;
};

const CustomerListContext = createContext<CustomerListContextValue | null>(
  null,
);

export function CustomerListProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: CustomerListContextValue;
}) {
  return (
    <CustomerListContext.Provider value={value}>
      {children}
    </CustomerListContext.Provider>
  );
}

export function useCustomerList() {
  const ctx = useContext(CustomerListContext);
  return (
    ctx ?? {
      customers: [] as MasterCustomer[],
      setCustomers: (_: MasterCustomer[]) => {},
      loading: false,
    }
  );
}

export function sortMasterCustomers(rows: MasterCustomer[]): MasterCustomer[] {
  return [...rows].sort((a, b) =>
    a.name.localeCompare(b.name, "en-ZA", { sensitivity: "base" }),
  );
}

export function filterMasterCustomers(
  rows: MasterCustomer[],
  q: string,
): MasterCustomer[] {
  const qq = q.trim().toLowerCase();
  if (!qq) return rows;
  return rows.filter(
    (r) =>
      r.name.toLowerCase().includes(qq) ||
      r.code.toLowerCase().includes(qq),
  );
}

export function useMasterCustomerMap(customers: MasterCustomer[]) {
  return useMemo(() => {
    const m = new Map<string, MasterCustomer>();
    for (const c of customers) m.set(c.code.toUpperCase(), c);
    return m;
  }, [customers]);
}
