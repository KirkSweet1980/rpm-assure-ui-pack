import { createFileRoute } from "@tanstack/react-router";
import { CspSecureScoreSection } from "@/components/customer/customer-sections";
import { Route as PillarRoute } from "./customers.$code.csp";

export const Route = createFileRoute("/customers/$code/csp/secure-score")({
  component: function CustomerChild() {
    const data = PillarRoute.useLoaderData();
    if (!data?.customer) return <p className="text-sm text-muted">Loading...</p>;
    return <CspSecureScoreSection data={data} />;
  },
});
