import { createFileRoute } from "@tanstack/react-router";
import { RmmDevicesSection } from "@/components/customer/customer-sections";
import { Route as PillarRoute } from "./customers.$code.rmm";

/** Legacy /rmm/overview — Platform Overview removed; show Servers */
export const Route = createFileRoute("/customers/$code/rmm/overview")({
  component: function CustomerChild() {
    const data = PillarRoute.useLoaderData();
    if (!data?.customer) {
      return <p className="text-sm text-muted">Loading customer workspace…</p>;
    }
    return <RmmDevicesSection data={data} />;
  },
});
