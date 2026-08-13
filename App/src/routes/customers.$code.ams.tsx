import { Outlet, createFileRoute } from "@tanstack/react-router";
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

export const Route = createFileRoute("/customers/$code/ams")({
  staleTime: 90_000,
  preloadStaleTime: 60_000,
  shouldReload: false,
  loader: async ({ params }) => {
    const code = decodeCode(params.code);
    const detail = await fetchCustomerDetail({
      data: { code, legs: ["shell", "ams"] },
    });
    return detail ?? softMissingCustomer(code);
  },
  component: () => <Outlet />,
});
