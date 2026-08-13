import { createFileRoute } from "@tanstack/react-router";
import { RmmHubSection } from "@/components/customer/customer-sections";
import { Route as PillarRoute } from "./customers.$code.rmm";

/** Default RMM landing — Platform Overview removed; open Servers */
export const Route = createFileRoute("/customers/$code/rmm/")({
  component: function CustomerChild() {
    const data = PillarRoute.useLoaderData();
    if (!data?.customer) {
      return (
        <p className="text-sm text-muted">
          Loading customer workspace… If this stays blank, use Refresh in the top bar.
        </p>
      );
    }
    return <RmmHubSection data={data} />;
  },
});
