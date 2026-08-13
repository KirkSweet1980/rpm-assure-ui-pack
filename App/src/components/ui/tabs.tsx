import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

/** shadcn-style Tabs — use for in-page switches; pillars use same trigger classes on SpaLink */
export const Tabs = TabsPrimitive.Root;

export function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "rpma-tabs-list inline-flex h-10 w-full items-center justify-start gap-0.5 rounded-lg bg-surface-2/80 p-1 text-muted",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "rpma-tabs-trigger inline-flex min-h-8 flex-1 items-center justify-center whitespace-nowrap rounded-md px-2.5 py-1.5 text-[12px] font-semibold transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
        "disabled:pointer-events-none disabled:opacity-50",
        "data-[state=inactive]:text-muted data-[state=inactive]:hover:text-fg",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn(
        "mt-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
        className,
      )}
      {...props}
    />
  );
}
