import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/portfolio/require-auth";
import { AppShell } from "@/components/portfolio/app-shell";

export const Route = createFileRoute("/ui-lab")({
  component: UiLabPage,
});

const OPTIONS = [
  {
    id: "A",
    name: "Linear / Vercel ink",
    blurb: "Near-black, hairline, almost no colour. Quiet and sharp.",
  },
  {
    id: "B",
    name: "Stripe ledger",
    blurb: "Navy rail, indigo action, warm paper. Finance feel.",
  },
  {
    id: "C",
    name: "shadcn zinc",
    blurb: "White + zinc, black selected item, big type. 2026 default product.",
  },
  {
    id: "D",
    name: "TailAdmin",
    blurb: "Slate sidebar, sky-blue accent, colourful KPIs. Classic admin kit.",
  },
  {
    id: "E",
    name: "Horizon",
    blurb: "Soft lilac, fat radius, floating sidebar. Marketing dashboard.",
  },
  {
    id: "F",
    name: "IBM Carbon",
    blurb: "Dense, square, IBM blue header. Built for operators.",
  },
] as const;

function UiLabPage() {
  return (
    <RequireAuth>
      <AppShell
        title="Choose a new UI"
        subtitle="Six full-app directions. Reply in chat with a letter — A to F — and the current GUI will be replaced."
      >
        <div className="space-y-8 pb-10">
          {OPTIONS.map((o) => (
            <article key={o.id} className="space-y-2">
              <div>
                <h2 className="text-lg font-bold text-fg">
                  {o.id} — {o.name}
                </h2>
                <p className="text-sm text-muted">{o.blurb}</p>
              </div>
              <img
                src={`/ui-lab/${o.id}.png`}
                alt={`${o.id} ${o.name}`}
                className="w-full rounded-xl"
              />
            </article>
          ))}
        </div>
      </AppShell>
    </RequireAuth>
  );
}
