import { createFileRoute } from "@tanstack/react-router";
import { ServiceSlaSection } from "@/components/customer/service-sla-section";
import { Route as PillarRoute } from "./customers.$code.cove";

export const Route = createFileRoute("/customers/$code/cove/sla")({
  component: function CustomerChild() {
    const data = PillarRoute.useLoaderData();
    if (!data?.customer) return <p className="text-sm text-muted">Loading…</p>;
    return <ServiceSlaSection data={data} pillar="cove" />;
  },
});
