import { createFileRoute } from "@tanstack/react-router";
import { AssuranceMatrix } from "@/components/customer/assurance-matrix";
import { fetchCustomerDetail } from "@/lib/data/portfolio";
import { softMissingCustomer } from "@/lib/data/soft-customer";

function decodeCode(raw: string): string {
  let s = String(raw ?? "").trim();
  try {
    s = decodeURIComponent(s);
  } catch {
    /* keep */
  }
  return s.trim();
}

export const Route = createFileRoute("/customers/$code/")({
  staleTime: 90_000,
  loader: async ({ params }) => {
    const code = decodeCode(params.code);
    // Ecosystem hub: SYSPRO + AMS signals only (not full RMM/Cove/EPP device lists)
    const detail = await fetchCustomerDetail({
      data: { code, legs: ["shell", "syspro", "ams", "rmm", "cove", "epp", "csp"] },
    });
    return detail ?? softMissingCustomer(code);
  },
  component: ExecPage,
});

function ExecPage() {
  const data = Route.useLoaderData();
  if (!data?.customer) {
    return <p className="text-sm text-muted">Loading customer workspace…</p>;
  }
  return <AssuranceMatrix data={data} />;
}
