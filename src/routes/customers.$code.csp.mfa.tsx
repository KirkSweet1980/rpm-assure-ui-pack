import { createFileRoute } from "@tanstack/react-router";
import { CspMfaSection } from "@/components/customer/customer-sections";
import { Route as PillarRoute } from "./customers.$code.csp";

export const Route = createFileRoute("/customers/$code/csp/mfa")({
  component: function CustomerChild() {
    const data = PillarRoute.useLoaderData();
    if (!data?.customer) return <p className="text-sm text-muted">Loading...</p>;
    return <CspMfaSection data={data} />;
  },
});
