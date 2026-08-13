import { Outlet } from "@tanstack/react-router";
import { NoCoverPanel } from "@/components/ui/no-cover";
import type { CustomerCover, PillarId } from "@/lib/data/cover";
import { isPillarCovered } from "@/lib/data/cover";

/** Every pillar route uses this: menu stays, page states Cover / No Cover. */
export function PillarCoverGate({
  cover,
  pillar,
  service,
}: {
  cover?: CustomerCover | null;
  pillar: PillarId;
  service: string;
}) {
  if (!isPillarCovered(cover, pillar)) {
    return (
      <NoCoverPanel
        service={service}
        hint="This pillar is on the menu for every customer. There is no live collect for this service yet, so it is No Cover and is not scored."
      />
    );
  }
  return <Outlet />;
}