import { SpaLink } from "@/components/nav/spa-link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import {
  findActiveTrail,
  isNavActive,
  type NavNode,
} from "@/lib/nav/site-tree";
import { cn } from "@/lib/utils";

export function TreeNav({
  nodes,
  pathname,
  onNavigate,
  depth = 0,
  variant = "sidebar",
}: {
  nodes: NavNode[];
  pathname: string;
  onNavigate?: () => void;
  depth?: number;
  /** sidebar = navy ops; light = on white surface */
  variant?: "sidebar" | "light";
}) {
  const trail = findActiveTrail(pathname, nodes) ?? [];
  const openIds = new Set(trail.map((n) => n.id));

  return (
    <ul
      className={cn("space-y-0.5", depth === 0 && "rpma-tree-root")}
      role={depth === 0 ? "tree" : "group"}
    >
      {nodes.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          pathname={pathname}
          onNavigate={onNavigate}
          depth={depth}
          defaultOpen={openIds.has(node.id) || depth === 0}
          variant={variant}
        />
      ))}
    </ul>
  );
}

function TreeNode({
  node,
  pathname,
  onNavigate,
  depth,
  defaultOpen,
  variant,
}: {
  node: NavNode;
  pathname: string;
  onNavigate?: () => void;
  depth: number;
  defaultOpen: boolean;
  variant: "sidebar" | "light";
}) {
  const hasKids = Boolean(node.children?.length);
  const active = isNavActive(pathname, node);
  const childActive = hasKids
    ? Boolean(findActiveTrail(pathname, node.children!))
    : false;
  const [open, setOpen] = useState(defaultOpen || childActive);

  useEffect(() => {
    if (defaultOpen || childActive) setOpen(true);
  }, [defaultOpen, childActive, pathname]);

  const pad = 0.55 + depth * 0.55;

  const itemCls = cn(
    "rpma-tree-item group flex w-full items-center gap-1 rounded-md text-left text-[13px] font-medium transition-colors",
    variant === "sidebar" &&
      (active
        ? "bg-white/15 text-white shadow-[inset_3px_0_0_0_var(--color-brand-teal)]"
        : childActive
          ? "text-white/95"
          : "text-white/75 hover:bg-white/10 hover:text-white"),
    variant === "light" &&
      (active
        ? "bg-accent-soft text-accent shadow-[inset_3px_0_0_0_var(--color-accent)]"
        : childActive
          ? "text-fg"
          : "text-muted hover:bg-surface-2 hover:text-fg"),
  );

  const chevron = hasKids ? (
    <button
      type="button"
      className={cn(
        "rpma-focus grid h-7 w-7 shrink-0 place-items-center rounded",
        variant === "sidebar" ? "hover:bg-white/10" : "hover:bg-surface-2",
      )}
      aria-label={open ? "Collapse" : "Expand"}
      aria-expanded={open}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOpen((v) => !v);
      }}
    >
      {open ? (
        <ChevronDown className="h-3.5 w-3.5 opacity-80" />
      ) : (
        <ChevronRight className="h-3.5 w-3.5 opacity-80" />
      )}
    </button>
  ) : (
    <span className="inline-block w-7 shrink-0" />
  );

  const audience =
    node.audience && depth > 0 ? (
      <span
        className={cn(
          "ml-auto hidden shrink-0 rounded px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide sm:inline",
          variant === "sidebar" ? "bg-white/10 text-white/50" : "bg-surface-2 text-subtle",
          node.audience === "exco" && "text-emerald-300/90",
          node.audience === "tech" && "opacity-70",
        )}
        title={
          node.audience === "exco"
            ? "Executive level"
            : node.audience === "tech"
              ? "Technical detail"
              : node.audience === "ops"
                ? "Operations"
                : "Admin"
        }
      >
        {node.audience === "exco"
          ? "ExCo"
          : node.audience === "tech"
            ? "Tech"
            : node.audience === "ops"
              ? "Ops"
              : "Admin"}
      </span>
    ) : null;

  return (
    <li role="treeitem" aria-expanded={hasKids ? open : undefined}>
      <div className={itemCls} style={{ paddingLeft: `${pad}rem`, paddingRight: "0.4rem" }}>
        {chevron}
        {node.href ? (
          <SpaLink
            href={node.href}
            onClick={onNavigate}
            className="rpma-focus flex min-w-0 flex-1 items-center gap-2 py-1.5"
            title={node.blurb || node.label}
          >
            <span className="truncate">{node.label}</span>
            {audience}
          </SpaLink>
        ) : (

          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2 py-1.5"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="truncate">{node.label}</span>
            {audience}
          </button>
        )}
      </div>
      {hasKids && open ? (
        <div className="mt-0.5">
          <TreeNav
            nodes={node.children!}
            pathname={pathname}
            onNavigate={onNavigate}
            depth={depth + 1}
            variant={variant}
          />
        </div>
      ) : null}
    </li>
  );
}

/** Horizontal breadcrumb from active trail */
export function TreeBreadcrumb({
  pathname,
  roots,
}: {
  pathname: string;
  roots: NavNode[];
}) {
  const trail = findActiveTrail(pathname, roots);
  if (!trail?.length) return null;
  return (
    <nav className="flex flex-wrap items-center gap-1 text-[12px]" aria-label="Location">
      {trail.map((n, i) => {
        const last = i === trail.length - 1;
        return (
          <span key={n.id} className="inline-flex items-center gap-1">
            {i > 0 ? (
              <ChevronRight className="h-3 w-3 text-subtle" aria-hidden />
            ) : null}
            {n.href && !last ? (
              <SpaLink href={n.href} className="font-medium text-muted hover:text-accent">
                {n.label}
              </SpaLink>
            ) : (
              <span className={last ? "font-semibold text-fg" : "text-muted"}>
                {n.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
