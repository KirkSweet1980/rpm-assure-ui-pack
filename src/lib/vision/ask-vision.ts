import { createServerFn } from "@tanstack/react-start";
import { getVisionConfig } from "@/lib/settings/settings-store";
import { composeVisionAnswer, retrieveVision } from "@/lib/vision/retrieve";

export const VISION_GREETING = "Hey, my name is Vision! How can I assist you today?";

export const askVision = createServerFn({ method: "POST" })
  .validator((data: { message: string; path?: string; customer?: string }) => data)
  .handler(async ({ data }) => {
    const message = String(data.message ?? "").slice(0, 2000);
    const cfg = getVisionConfig();
    if (!message.trim()) {
      return { ok: true as const, text: VISION_GREETING, hits: [] as const };
    }
    if (!cfg.enabled) {
      return {
        ok: true as const,
        text: "Vision retrieval is turned off in Configuration → Vision.",
        hits: [] as const,
      };
    }
    const hits = retrieveVision(message, cfg, data.path);
    return {
      ok: true as const,
      text: composeVisionAnswer(hits, data.path, data.customer, cfg.includePath, cfg.includeCustomer),
      hits,
    };
  });
