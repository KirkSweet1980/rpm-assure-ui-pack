import { createFileRoute } from "@tanstack/react-router";
import { ServiceModuleMatrix } from "@/components/customer/service-module-matrix";
import { Route as PillarRoute } from "./customers.$code.syspro";

export const Route = createFileRoute("/customers/$code/syspro/")({
  component: function CustomerChild() {
  const data = PillarRoute.useLoaderData();
  if (!data?.customer) {
    return (
      <p className="text-sm text-muted">
        Loading customer workspace… If this stays blank, use Refresh in the top bar.
      </p>
    );
  }
  return <ServiceModuleMatrix data={data} pillar="syspro" />;
},
});
