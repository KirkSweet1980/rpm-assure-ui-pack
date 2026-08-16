import { createFileRoute } from "@tanstack/react-router";
import { fetchCustomerDetail } from "@/lib/data/portfolio";
import { softMissingCustomer } from "@/lib/data/soft-customer";
import { PillarCoverGate } from "@/components/customer/pillar-cover-gate";

function decodeCode(raw: string): string {
  let s = String(raw ?? "").trim();
  try {
    s = decodeURIComponent(s);
  } catch {
    /* keep */
  }
  return s.trim();
}

export const Route = createFileRoute("/customers/$code/epp")({
  staleTime: 15_000,
  preloadStaleTime: 10_000,
  shouldReload: true,
  loader: async ({ params }) => {
    const code = decodeCode(params.code);
    const detail = await fetchCustomerDetail({
      data: { code, legs: ["shell", "epp"] },
    });
    return detail ?? softMissingCustomer(code);
  },
  component: function EppPillar() {
    const data = Route.useLoaderData();
    return (
      <PillarCoverGate
        cover={data?.cover}
        pillar="epp"
        service="RPM EPP"
      />
    );
  },
});