import { createFileRoute } from "@tanstack/react-router";
import { AppLoading } from "@/components/ui/app-state";
import { CspLicensesSection } from "@/components/customer/customer-sections";
import { Route as PillarRoute } from "./customers.$code.csp";

export const Route = createFileRoute("/customers/$code/csp/licenses")({
  component: function CustomerChild() {
    const data = PillarRoute.useLoaderData();
    if (!data?.customer) return <AppLoading />;
    return <CspLicensesSection data={data} />;
  },
});