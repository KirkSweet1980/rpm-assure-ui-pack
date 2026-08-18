import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { RpmRevCounter } from "@/components/brand/rpm-rev-counter";

const MIN_MS = 420;
const MAX_MS = 8000;

function isNavClick(el: EventTarget | null) {
  if (!(el instanceof Element)) return false;
  return Boolean(
    el.closest(
      "a[href], .dk-link, .rpma-emp-gtab, .rpma-emp-tool, .rpma-modbtn, .rpma-top-link, [data-rpma-wait]",
    ),
  );
}

/** Centered rev-counter while menus / routes settle. */
export function PageRevWait() {
  const busy = useRouterState({
    select: (s) => Boolean(s.isLoading || s.isTransitioning),
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
    if (busy) arm();
    else settle();
  }, [busy]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (isNavClick(e.target)) arm();
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
        <RpmRevCounter className="rpma-rev-wait-gauge" size={168} />
        <span className="rpma-rev-wait-cap">Loading</span>
      </div>
    </div>
  );
}
