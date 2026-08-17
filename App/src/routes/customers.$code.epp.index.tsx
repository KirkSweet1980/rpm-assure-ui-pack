import { createFileRoute } from "@tanstack/react-router";
import { EppHubSection } from "@/components/customer/customer-sections";
import { Route as PillarRoute } from "./customers.$code.epp";

export const Route = createFileRoute("/customers/$code/epp/")({
  component: function CustomerChild() {
    const data = PillarRoute.useLoaderData();
    if (!data?.customer) {
      return <p className="text-sm text-muted">Loading customer workspace…</p>;
    }
    return <EppHubSection data={data} />;
  },
});
