import { createFileRoute } from "@tanstack/react-router";
import { SpaLink } from "@/components/nav/spa-link";
import { HELP_GROUPS, HELP_TOPICS } from "@/lib/help/catalog";

export const Route = createFileRoute("/help/")({
  component: HelpHome,
});

function HelpHome() {
  return (
    <article className="rpma-help-article">
      <h1>RPM Assure help</h1>
      <p className="lead">
        Monitoring and operational intelligence for RPM-managed customers. This is not a ticketing
        system. Choose a topic from the catalogue.
      </p>
      {HELP_GROUPS.map((g) => (
        <section key={g} className="rpma-help-group-block">
          <h2>{g}</h2>
          <ul className="rpma-help-cards">
            {HELP_TOPICS.filter((t) => t.group === g).map((t) => (
              <li key={t.id}>
                <SpaLink href={`/help/${t.id}`}>
                  <strong>{t.title}</strong>
                  <span>{t.summary}</span>
                </SpaLink>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </article>
  );
}