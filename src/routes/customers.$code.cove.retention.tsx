import { createFileRoute } from "@tanstack/react-router";
import { CoveRetentionSection } from "@/components/customer/customer-sections";
import { Route as PillarRoute } from "./customers.$code.cove";

export const Route = createFileRoute("/customers/$code/cove/retention")({
  component: function CustomerChild() {
    const data = PillarRoute.useLoaderData();
    if (!data?.customer) {
      return <p className="text-sm text-muted">Loading customer workspace…</p>;
    }
    return <CoveRetentionSection data={data} />;
  },
});
