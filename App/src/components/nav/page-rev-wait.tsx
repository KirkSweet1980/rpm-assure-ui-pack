import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { RpmRevCounter } from "@/components/brand/rpm-rev-counter";

const MIN_MS = 420;
const MAX_MS = 8000;

function isCustomerWorkspace(path: string | null | undefined) {
  if (!path) return false;
  return /^\/customers\/[^/?#]+/i.test(path);
}

function hrefFrom(el: EventTarget | null): string | null {
  if (!(el instanceof Element)) return null;
  const a = el.closest("a[href]");
  if (a instanceof HTMLAnchorElement) return a.getAttribute("href");
  return null;
}

/** Rev-counter only when opening a tenant workspace, not Customer Tenant list. */
export function PageRevWait() {
  const dest = useRouterState({
    select: (s) => ({
      busy: Boolean(s.isLoading || s.isTransitioning),
      path: s.resolvedLocation?.pathname ?? s.location.pathname,
    }),
  });
  const [show, setShow] = useState(false);
  const hideAt = useRef(0);
  const maxTimer = useRef(0);
  const hideTimer = useRef(0);

  function arm() {
    hideAt.current = Date.now() + MIN_MS;
    setShow(true);
    window.clearTimeout(maxTimer.current);
    maxTimer.current = window.setTimeout(() => setShow(false), MAX_MS);
  }

  function settle() {
    const wait = Math.max(0, hideAt.current - Date.now());
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setShow(false), wait);
  }

  useEffect(() => {
    if (dest.busy && isCustomerWorkspace(dest.path)) arm();
    else settle();
  }, [dest.busy, dest.path]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const href = hrefFrom(e.target);
      if (href && isCustomerWorkspace(href)) arm();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    return () => {
      window.clearTimeout(maxTimer.current);
      window.clearTimeout(hideTimer.current);
    };
  }, []);

  if (!show) return null;

  return (
    <div className="rpma-rev-wait" role="status" aria-live="polite" aria-label="Loading">
      <div className="rpma-rev-wait-dial">
        <RpmRevCounter className="rpma-rev-wait-gauge" size={52} />
        <span className="rpma-rev-wait-cap">Loading</span>
      </div>
    </div>
  );
}
