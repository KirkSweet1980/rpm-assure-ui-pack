import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** DashboardKit badge / badge-light-* */
const badgeVariants = cva(
  "dk-badge inline-flex items-center justify-center rounded px-1.5 py-0 text-[11px] font-semibold leading-5 tracking-normal",
  {
    variants: {
      variant: {
        default: "bg-[#f3f5f7] text-[#5b6b79]",
        muted: "bg-[#f3f5f7] text-[#8996a4]",
        outline: "border border-[#dbe0e5] bg-transparent text-[#5b6b79]",
        green: "bg-[#17c6661a] text-[#17c666]",
        amber: "bg-[#ffa21d1a] text-[#e67e22]",
        red: "bg-[#ea4d4d1a] text-[#ea4d4d]",
        nav: "bg-white/15 text-nav-fg",
        accent: "bg-[#7267ef1a] text-[#7267ef]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
