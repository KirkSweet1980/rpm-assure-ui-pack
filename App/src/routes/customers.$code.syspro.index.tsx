import { createFileRoute } from "@tanstack/react-router";
import { SysproHubSection } from "@/components/customer/customer-sections";
import { Route as PillarRoute } from "./customers.$code.syspro";

export const Route = createFileRoute("/customers/$code/syspro/")({
  component: function CustomerChild() {
    const data = PillarRoute.useLoaderData();
    if (!data?.customer) {
      return <p className="text-sm text-muted">Loading customer workspace…</p>;
    }
    return <SysproHubSection data={data} />;
  },
});
