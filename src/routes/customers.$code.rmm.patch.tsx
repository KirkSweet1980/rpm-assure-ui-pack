import { createFileRoute } from "@tanstack/react-router";
import { RmmPatchSection } from "@/components/customer/customer-sections";
import { Route as PillarRoute } from "./customers.$code.rmm";

export const Route = createFileRoute("/customers/$code/rmm/patch")({
  component: function CustomerChild() {
    const data = PillarRoute.useLoaderData();
    if (!data?.customer) return <p className="text-sm text-muted">Loading…</p>;
    return <RmmPatchSection data={data} />;
  },
});
