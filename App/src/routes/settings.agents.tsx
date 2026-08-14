import { createFileRoute } from "@tanstack/react-router";
import { AgentFleetPanel } from "@/components/settings/agent-fleet-panel";

export const Route = createFileRoute("/settings/agents")({
  component: AgentsPage,
});

function AgentsPage() {
  return <AgentFleetPanel />;
}