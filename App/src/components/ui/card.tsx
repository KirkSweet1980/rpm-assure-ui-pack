import * as React from "react";
import { cn } from "@/lib/utils";

/** shadcn-style Card — flat border, consistent padding (Phase 1) */
export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rpma-card relative overflow-hidden rounded-xl border border-border bg-surface text-fg shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

/** Legacy panel heading — keeps Exco Show/Hide headers working */
export function CardHead({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rpma-panel-heading flex items-center border-b border-border px-4 py-3 font-semibold tracking-tight text-fg",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col gap-1 space-y-0 p-4 pb-2 sm:p-5 sm:pb-2", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      className={cn(
        "text-sm font-semibold leading-none tracking-tight text-fg sm:text-[0.95rem]",
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-[12px] text-muted", className)} {...props} />;
}

export function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("ml-auto flex shrink-0 items-center gap-1.5", className)}
      {...props}
    />
  );
}

export function CardContent({ className, style, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("p-4 pt-2 sm:p-5 sm:pt-2", className)}
      style={style}
      {...props}
    />
  );
}

export function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-center border-t border-border px-4 py-3 sm:px-5", className)}
      {...props}
    />
  );
}
