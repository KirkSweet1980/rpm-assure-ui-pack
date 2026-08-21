import { Link, createFileRoute } from "@tanstack/react-router";
import { helpTopic } from "@/lib/help/catalog";

export const Route = createFileRoute("/help/$topic")({
  component: HelpTopicPage,
});

function HelpTopicPage() {
  const { topic } = Route.useParams();
  const t = helpTopic(topic);
  if (!t) {
    return (
      <article className="rpma-help-article">
        <h1>Topic not found</h1>
        <p>That Help topic is not in the catalogue.</p>
        <p>
          <Link to="/help">Back to Help catalogue</Link>
        </p>
      </article>
    );
  }
  return (
    <article className="rpma-help-article">
      <p>
        <Link to="/help">Help catalogue</Link>
        <span aria-hidden> · </span>
        <span className="kicker">{t.group}</span>
      </p>
      <h1>{t.title}</h1>
      <p className="lead">{t.summary}</p>
      {t.body.map((p) => (
        <p key={p.slice(0, 48)}>{p}</p>
      ))}
    </article>
  );
}