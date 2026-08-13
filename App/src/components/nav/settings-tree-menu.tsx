import { SpaLink } from "@/components/nav/spa-link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import {
  findActiveTrail,
  isNavActive,
  settingsTree,
  type NavNode,
} from "@/lib/nav/site-tree";
import { cn } from "@/lib/utils";

/**
 * Nested Settings menu — same expand/collapse depth pattern as Customers.
 * Used in top-nav dropdown, mobile drawer, and settings page sidebar.
 */
export function SettingsTreeMenu({
  pathname,
  onNavigate,
  variant = "dropdown",
  adminOnly = true,
}: {
  pathname: string;
  onNavigate?: () => void;
  /** dropdown = glass panel; sidebar = light page chrome; mobile = navy drawer */
  variant?: "dropdown" | "sidebar" | "mobile";
  /** When false, only show My account (profile / 2FA) for non-admin staff */
  adminOnly?: boolean;
}) {
  const root = settingsTree();
  const groups = (root.children ?? []).filter((g) => {
    if (adminOnly) return true;
    return g.audience === "ops" || g.id === "set-account";
  });

  return (
    <div
      className={cn(
        variant === "dropdown" && "w-72 max-h-[min(70vh,520px)] overflow-y-auto py-1",
        variant === "sidebar" && "space-y-1",
        variant === "mobile" && "space-y-1",
      )}
      role="tree"
      aria-label="Settings"
    >
      {variant === "dropdown" ? (
        <>
          <SpaLink
            href={adminOnly ? "/settings/sql" : "/settings/profile"}
            className="rpma-dd-head"
            onClick={onNavigate}
          >
            Open Settings
          </SpaLink>
          <div className="rpma-dd-sep" />
        </>
      ) : null}

      {groups.map((group) => (
        <SettingsGroup
          key={group.id}
          node={group}
          pathname={pathname}
          onNavigate={onNavigate}
          variant={variant}
        />
      ))}
    </div>
  );
}

function SettingsGroup({
  node,
  pathname,
  onNavigate,
  variant,
}: {
  node: NavNode;
  pathname: string;
  onNavigate?: () => void;
  variant: "dropdown" | "sidebar" | "mobile";
}) {
  const hasKids = Boolean(node.children?.length);
  const trail = findActiveTrail(pathname, [node]);
  const childActive = Boolean(trail && trail.length > 1);
  const selfActive = isNavActive(pathname, node);
  const [open, setOpen] = useState(childActive || selfActive);

  useEffect(() => {
    if (childActive || selfActive) setOpen(true);
  }, [childActive, selfActive, pathname]);

  if (!hasKids) {
    return (
      <LeafLink
        node={node}
        pathname={pathname}
        onNavigate={onNavigate}
        variant={variant}
        depth={0}
      />
    );
  }

  /* Dropdown sits on light glass panel; only mobile drawer is navy */
  const isDark = variant === "mobile";

  return (
    <div role="treeitem" aria-expanded={open} className="mb-0.5">
      <div className={cn("flex w-full items-center gap-0.5", isDark && "px-1")}>
        <button
          type="button"
          className={cn(
            "rpma-focus grid h-8 w-8 shrink-0 place-items-center rounded-md",
            isDark
              ? "text-white/70 hover:bg-white/10 hover:text-white"
              : "text-muted hover:bg-surface-2 hover:text-fg",
          )}
          aria-label={open ? `Collapse ${node.label}` : `Expand ${node.label}`}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
        <SpaLink
          href={node.href || "/settings"}
          className={cn(
            "flex min-w-0 flex-1 items-center rounded-md px-1.5 py-1.5 text-left text-[13px] font-semibold tracking-tight transition",
            isDark
              ? childActive || selfActive
                ? "text-white"
                : "text-white/85 hover:bg-white/10 hover:text-white"
              : childActive || selfActive
                ? "bg-accent-soft text-accent"
                : "text-fg hover:bg-surface-2",
          )}
          onClick={() => {
            setOpen(true);
            onNavigate?.();
          }}
        >
          <span className="min-w-0 flex-1 truncate">{node.label}</span>
          {node.blurb && variant === "sidebar" ? null : node.blurb && variant === "dropdown" ? (
            <span className="ml-2 hidden max-w-[8rem] truncate text-[10px] font-medium text-subtle sm:inline">
              {node.blurb}
            </span>
          ) : null}
        </SpaLink>
      </div>

      {open ? (
        <ul
          className={cn(
            "mt-0.5 space-y-0.5",
            isDark ? "ml-3 border-l border-white/15 pl-2" : "ml-3 border-l border-border pl-2",
          )}
          role="group"
        >
          {node.children!.map((child) => (
            <li key={child.id}>
              <LeafLink
                node={child}
                pathname={pathname}
                onNavigate={onNavigate}
                variant={variant}
                depth={1}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function LeafLink({
  node,
  pathname,
  onNavigate,
  variant,
  depth,
}: {
  node: NavNode;
  pathname: string;
  onNavigate?: () => void;
  variant: "dropdown" | "sidebar" | "mobile";
  depth: number;
}) {
  const active = isNavActive(pathname, node);
  /* Dropdown sits on light glass panel; only mobile drawer is navy */
  const isDark = variant === "mobile";

  return (
    <SpaLink
      href={node.href || "/settings"}
      role="treeitem"
      onClick={onNavigate}
      className={cn(
        "block rounded-md px-2.5 py-1.5 text-[13px] font-medium transition",
        depth === 0 && "font-bold",
        isDark &&
          (active
            ? "bg-white/15 text-white shadow-[inset_3px_0_0_0_#1bb8a6]"
            : "text-white/80 hover:bg-white/10 hover:text-white"),
        variant === "sidebar" &&
          (active
            ? "bg-accent-soft text-accent shadow-[inset_3px_0_0_0_var(--color-accent)]"
            : "text-fg/85 hover:bg-surface-2 hover:text-fg"),
      )}
      title={node.blurb}
    >
      <span className="block truncate">{node.label}</span>
      {node.blurb && variant === "sidebar" ? (
        <span className="mt-0.5 block truncate text-[11px] font-normal text-muted">
          {node.blurb}
        </span>
      ) : null}
    </SpaLink>
  );
}
