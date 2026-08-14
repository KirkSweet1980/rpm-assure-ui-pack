import { Outlet } from "@tanstack/react-router";
import type { CustomerCover, PillarId } from "@/lib/data/cover";

/**
 * Always mount the pillar outlet so module pages (and mapping) can render.
 * Each module already shows NoCoverPanel when that service has no data.
 */
export function PillarCoverGate({
  cover: _cover,
  pillar: _pillar,
  service: _service,
}: {
  cover?: CustomerCover | null;
  pillar: PillarId;
  service: string;
}) {
  return <Outlet />;
}