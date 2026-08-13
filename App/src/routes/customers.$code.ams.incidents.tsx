import { createFileRoute } from "@tanstack/react-router";
import { IncidentsSection } from "@/components/customer/customer-sections";
import { Route as PillarRoute } from "./customers.$code.ams";

export const Route = createFileRoute("/customers/$code/ams/incidents")({
  component: function CustomerChild() {
  const data = PillarRoute.useLoaderData();
  if (!data?.customer) {
    return (
      <p className="text-sm text-muted">
        Loading customer workspace… If this stays blank, use Refresh in the top bar.
      </p>
    );
  }
  return <IncidentsSection data={data} />;
},
});
