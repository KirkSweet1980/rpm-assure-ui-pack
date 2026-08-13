import { createFileRoute } from "@tanstack/react-router";
import { CoveRecoverySection } from "@/components/customer/customer-sections";
import { Route as PillarRoute } from "./customers.$code.cove";

export const Route = createFileRoute("/customers/$code/cove/recovery")({
  component: function CustomerChild() {
    const data = PillarRoute.useLoaderData();
    if (!data?.customer) return <p className="text-sm text-muted">Loading…</p>;
    return <CoveRecoverySection data={data} />;
  },
});
