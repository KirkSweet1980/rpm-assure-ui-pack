import { createServerFn } from "@tanstack/react-start";
import { getVisionConfig } from "@/lib/settings/settings-store";
import { composeVisionAnswer, retrieveVision } from "@/lib/vision/retrieve";
import { formatVisionSnap, loadVisionTenantSnap } from "@/lib/vision/tenant-snap";

export const VISION_GREETING = "Hey, my name is Vision! How can I assist you today?";

export const askVision = createServerFn({ method: "POST" })
  .validator((data: { message: string; path?: string; customer?: string }) => data)
  .handler(async ({ data }) => {
    const message = String(data.message ?? "").slice(0, 2000);
    const cfg = getVisionConfig();
    const snap =
      cfg.includeCustomer && data.customer
        ? await loadVisionTenantSnap(data.customer)
        : null;
    const live = snap ? formatVisionSnap(snap) : null;

    if (!message.trim()) {
      return {
        ok: true as const,
        text: live ? `${VISION_GREETING}\n\n${live}` : VISION_GREETING,
        hits: [] as const,
        live,
      };
    }
    if (!cfg.enabled) {
      return {
        ok: true as const,
        text: "Vision retrieval is turned off in Configuration → Vision.",
        hits: [] as const,
        live,
      };
    }
    const hits = retrieveVision(message, cfg, data.path);
    return {
      ok: true as const,
      text: composeVisionAnswer(hits, data.path, data.customer, cfg.includePath, cfg.includeCustomer, live),
      hits,
      live,
    };
  });
