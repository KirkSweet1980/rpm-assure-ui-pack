import { createFileRoute } from "@tanstack/react-router";
import { CoveDevicesSection } from "@/components/customer/customer-sections";
import { Route as PillarRoute } from "./customers.$code.cove";

/** Legacy /cove/overview — Device stats removed; show Devices on Cloud Backup */
export const Route = createFileRoute("/customers/$code/cove/overview")({
  component: function CustomerChild() {
    const data = PillarRoute.useLoaderData();
    if (!data?.customer) {
      return <p className="text-sm text-muted">Loading customer workspace…</p>;
    }
    return <CoveDevicesSection data={data} />;
  },
});
