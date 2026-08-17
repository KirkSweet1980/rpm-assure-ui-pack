import { createFileRoute } from "@tanstack/react-router";
import { TicketsHubSection } from "@/components/customer/tickets-sections";
import { Route as PillarRoute } from "./customers.$code.tickets";

export const Route = createFileRoute("/customers/$code/tickets/")({
  component: function CustomerChild() {
    const data = PillarRoute.useLoaderData();
    if (!data?.customer) {
      return <p className="text-sm text-muted">Loading customer workspace…</p>;
    }
    return <TicketsHubSection data={data} />;
  },
});
