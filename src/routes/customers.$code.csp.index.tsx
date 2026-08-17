import { createFileRoute } from "@tanstack/react-router";
import { ServiceModuleMatrix } from "@/components/customer/service-module-matrix";
import { Route as PillarRoute } from "./customers.$code.csp";

export const Route = createFileRoute("/customers/$code/csp/")({
  component: function CustomerChild() {
    const data = PillarRoute.useLoaderData();
    if (!data?.customer) {
      return <p className="text-sm text-muted">Loading customer workspace…</p>;
    }
    return <ServiceModuleMatrix data={data} pillar="csp" />;
  },
});
