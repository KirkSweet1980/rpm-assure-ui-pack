import { createFileRoute } from "@tanstack/react-router";
import { CspTenantHealthSection } from "@/components/customer/customer-sections";
import { Route as PillarRoute } from "./customers.$code.csp";

export const Route = createFileRoute("/customers/$code/csp/")({
  component: function CustomerChild() {
    const data = PillarRoute.useLoaderData();
    if (!data?.customer) {
      return <p className="text-sm text-muted">Loading customer workspace…</p>;
    }
    return <CspTenantHealthSection data={data} />;
  },
});
