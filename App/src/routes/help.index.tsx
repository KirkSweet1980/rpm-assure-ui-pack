import { createFileRoute } from "@tanstack/react-router";
import { SpaLink } from "@/components/nav/spa-link";
import { HELP_TOPICS } from "@/lib/help/catalog";

export const Route = createFileRoute("/help/")({
  component: HelpHome,
});

function HelpHome() {
  return (
    <article className="rpma-help-article">
      <h1>RPM Assure help</h1>
      <p className="lead">
        How the live application works: cover, RAG, agents, services, SLA, and configuration.
      </p>
      <ul className="rpma-help-cards">
        {HELP_TOPICS.map((t) => (
          <li key={t.id}>
            <SpaLink href={`/help/${t.id}`}>
              <strong>{t.title}</strong>
              <span>{t.summary}</span>
            </SpaLink>
          </li>
        ))}
      </ul>
    </article>
  );
}
