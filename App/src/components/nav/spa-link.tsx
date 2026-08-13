import { useRouter } from "@tanstack/react-router";
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import { forwardRef, useRef } from "react";
import { preloadHref } from "@/lib/nav/preload";
import { scrollChromeToTop } from "@/lib/nav/scroll-chrome";

/** Default intent delay — avoid preload storm when sweeping across the nav. */
const INTENT_DELAY_MS = 45;

/**
 * Client-side navigation without a full document reload.
 * Intent preload (hover/focus/touch) is debounced + deduped via shared strategy.
 * After a click, the main pane snaps to the top so the new page is not mid-scroll.
 */
export const SpaLink = forwardRef<
  HTMLAnchorElement,
  {
    href: string;
    className?: string;
    children?: ReactNode;
    onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
    replace?: boolean;
    /** Set false for pure anchors that should not warm loaders */
    preload?: boolean;
    /** Default true — land at the top of the destination. */
    resetScroll?: boolean;
  } & Omit<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    "href" | "onClick" | "className" | "children"
  >
>(function SpaLink(
  {
    href,
    className,
    children,
    onClick,
    replace = false,
    preload = true,
    resetScroll = true,
    ...rest
  },
  ref,
) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelIntent = () => {
    if (timer.current != null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const scheduleIntent = () => {
    if (!preload) return;
    cancelIntent();
    timer.current = setTimeout(() => {
      timer.current = null;
      preloadHref(router, href, { priority: "high" });
    }, INTENT_DELAY_MS);
  };

  return (
    <a
      ref={ref}
      href={href}
      className={className}
      onMouseEnter={scheduleIntent}
      onMouseLeave={cancelIntent}
      onFocus={scheduleIntent}
      onBlur={cancelIntent}
      onTouchStart={() => {
        if (preload) preloadHref(router, href, { priority: "high" });
      }}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        const target = (e.currentTarget as HTMLAnchorElement).target;
        if (target && target !== "_self") return;
        e.preventDefault();
        cancelIntent();
        if (preload) preloadHref(router, href, { priority: "high" });
        const hasHash = href.includes("#") && !href.endsWith("#");
        const nav = router.navigate({
          href,
          replace,
          resetScroll: resetScroll && !hasHash,
        } as never);
        void Promise.resolve(nav).finally(() => {
          if (resetScroll && !hasHash) {
            requestAnimationFrame(scrollChromeToTop);
          }
        });
      }}
      {...rest}
    >
      {children}
    </a>
  );
});

/** Programmatic SPA navigation (customer switcher, etc.) */
export function useSpaNavigate() {
  const router = useRouter();
  return (href: string, opts?: { replace?: boolean; resetScroll?: boolean }) => {
    preloadHref(router, href, { priority: "high" });
    const reset = opts?.resetScroll !== false;
    const hasHash = href.includes("#") && !href.endsWith("#");
    void Promise.resolve(
      router.navigate({
        href,
        replace: opts?.replace,
        resetScroll: reset && !hasHash,
      } as never),
    ).finally(() => {
      if (reset && !hasHash) requestAnimationFrame(scrollChromeToTop);
    });
  };
}
