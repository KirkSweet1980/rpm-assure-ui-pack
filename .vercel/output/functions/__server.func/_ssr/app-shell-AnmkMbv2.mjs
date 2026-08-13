import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { _ as Navigate, g as Link, l as useRouterState, y as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { t as cn } from "./utils-BpkUUAOs.mjs";
import { r as fetchPortfolio } from "./portfolio-C-mAzdfM.mjs";
import { n as SpaLink, r as useSpaNavigate, t as RagBadge } from "./rag-badge--H4DTZx7.mjs";
import { n as signOut } from "./client-GruXRyhu.mjs";
import { i as useTheme, r as useDensity } from "./theme-CBGmf9SK.mjs";
import { n as useDashboardConfig } from "./use-dashboard-config-yLPMN8xO.mjs";
import { n as useCurrentUserState, t as useCurrentUser } from "./use-current-user-CsON5Gdz.mjs";
import { t as useStaffProfile } from "./use-staff-profile-CtJQjgds.mjs";
import { t as Button } from "./button-rM46W5TP.mjs";
import { n as useIdleLogout } from "./idle-logout-CvUgb-Vj.mjs";
import { C as Pin, E as Monitor, J as Building2, K as ChevronDown, L as FileText, T as Moon, c as StretchHorizontal, f as Settings, g as Rows3, j as LayoutDashboard, l as Star, m as Search, s as Sun, v as RefreshCw } from "../_libs/lucide-react.mjs";
import { a as Root2, i as Portal2, n as Item2, o as Separator2, r as Label2, s as Trigger, t as Content2 } from "../_libs/@radix-ui/react-dropdown-menu+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/app-shell-AnmkMbv2.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/**
* Auth state components — plain wrappers around `useCurrentUserState()`.
*
* Auth is ON by default (including the sandbox live preview, which does real
* sign-in). Visitors are signed out until they authenticate. The shared dev
* user only appears when auth is explicitly disabled (`VITE_AUTH_ENABLED=false`).
* While the session is still resolving, gates that care about signed-out state
* render nothing so there's no signed-out flash on hard reload.
*/
/** Where `RedirectToSignIn` sends signed-out visitors. Create this route. */
var SIGN_IN_PATH = "/login";
/**
* Client-side redirect to the sign-in route (TanStack `<Navigate>` — NOT a full
* `window.location` reload). A hard navigation re-bootstraps the SPA and re-runs
* session loading, which feels like a second "Loading…" on /login.
*
* Guard routes by waiting out `isPending` first (see `use-current-user`), then
* render this.
*/
function RedirectToSignIn({ to = SIGN_IN_PATH }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigate, { to });
}
/**
* Minimal signed-in identity chip + security link + sign-out.
*/
function UserButton() {
	const user = useCurrentUser();
	if (!user) return null;
	const label = user.displayName ?? user.primaryEmail ?? "Account";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-2",
		children: [
			user.profileImageUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: user.profileImageUrl,
				alt: "",
				className: "h-8 w-8 rounded-full object-cover"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "grid h-8 w-8 place-items-center rounded-full bg-black/10 text-sm font-medium dark:bg-white/20",
				children: label.charAt(0).toUpperCase()
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-sm font-medium",
				children: label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => void signOut(),
				className: "cursor-pointer text-sm underline-offset-4 opacity-70 hover:underline",
				children: "Sign out"
			}) })
		]
	});
}
function RequireAuth({ children }) {
	const { user, isPending: userPending } = useCurrentUserState();
	const { profile, isPending: rolePending } = useStaffProfile();
	if (userPending && !user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-dvh items-center justify-center bg-bg text-sm text-muted",
		children: "Checking session…"
	});
	if (!user && !userPending) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RedirectToSignIn, {});
	if (user && rolePending && !profile) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-dvh items-center justify-center bg-bg text-sm text-muted",
		children: "Checking role…"
	});
	if (user && !rolePending && !profile) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg p-6 text-center",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-lg font-semibold text-fg",
				children: "Could not load role"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "max-w-md text-sm text-muted",
				children: [
					"Signed in as ",
					user.primaryEmail ?? user.id,
					", but staff profile could not be resolved. Check Live SQL / App_User, or try again."
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "button",
				variant: "secondary",
				onClick: () => void signOut(),
				children: "Sign out"
			})
		]
	});
	if (profile && !profile.permissions.canViewPortfolio) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg p-6 text-center",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-lg font-semibold text-fg",
				children: "Access denied"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "max-w-md text-sm text-muted",
				children: [
					"Your account (",
					profile.email,
					") is inactive or has no Portfolio access. Ask a Platform Admin to enable you in ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-mono",
						children: "App_User"
					}),
					"."
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "button",
					variant: "secondary",
					onClick: () => void signOut(),
					children: "Sign out"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					asChild: true,
					variant: "ghost",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/login",
						children: "Back to login"
					})
				})]
			})
		]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children });
}
function DensityToggle({ className, compact = false }) {
	const { density, setDensity } = useDensity();
	if (compact) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("rpma-nav-seg", className),
		role: "group",
		"aria-label": "Layout density",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			onClick: () => setDensity("comfortable"),
			title: "Comfortable spacing",
			"aria-pressed": density === "comfortable",
			className: cn("rpma-nav-seg-btn", density === "comfortable" && "rpma-nav-seg-btn-active"),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StretchHorizontal, {
				className: "h-3.5 w-3.5",
				"aria-hidden": true
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "sr-only",
				children: "Comfortable"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			onClick: () => setDensity("compact"),
			title: "Compact spacing",
			"aria-pressed": density === "compact",
			className: cn("rpma-nav-seg-btn", density === "compact" && "rpma-nav-seg-btn-active"),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Rows3, {
				className: "h-3.5 w-3.5",
				"aria-hidden": true
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "sr-only",
				children: "Compact"
			})]
		})]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("inline-flex items-center rounded-lg border border-border bg-bg/80 p-0.5 text-xs shadow-sm", className),
		role: "group",
		"aria-label": "Layout density",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			onClick: () => setDensity("comfortable"),
			className: cn("rounded-md px-2.5 py-1 font-medium transition-colors duration-150", density === "comfortable" ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"),
			children: "Comfortable"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			onClick: () => setDensity("compact"),
			className: cn("rounded-md px-2.5 py-1 font-medium transition-colors duration-150", density === "compact" ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"),
			children: "Compact"
		})]
	});
}
var OPTIONS = [
	{
		id: "light",
		label: "Light",
		icon: Sun
	},
	{
		id: "dark",
		label: "Dark",
		icon: Moon
	},
	{
		id: "auto",
		label: "Auto",
		icon: Monitor
	}
];
function ThemeToggle({ className, compact = false }) {
	const { preference, setPreference } = useTheme();
	if (compact) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("rpma-nav-seg", className),
		role: "group",
		"aria-label": "Colour theme",
		children: OPTIONS.map(({ id, label, icon: Icon }) => {
			const active = preference === id;
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: () => setPreference(id),
				title: label,
				"aria-pressed": active,
				className: cn("rpma-nav-seg-btn", active && "rpma-nav-seg-btn-active"),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
					className: "h-3.5 w-3.5 shrink-0",
					"aria-hidden": true
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "sr-only",
					children: label
				})]
			}, id);
		})
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("inline-flex items-center rounded-lg border border-border bg-bg p-0.5 text-xs shadow-sm", className),
		role: "group",
		"aria-label": "Colour theme",
		children: OPTIONS.map(({ id, label, icon: Icon }) => {
			const active = preference === id;
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: () => setPreference(id),
				title: label,
				className: cn("inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium transition-colors", active ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg"),
				"aria-pressed": active,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
					className: "h-3.5 w-3.5 shrink-0",
					"aria-hidden": true
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label })]
			}, id);
		})
	});
}
/**
* Top-nav brand lockup: larger cube + RPM Assure wordmark.
*/
function RpmAssureNavLogo({ className }) {
	const uid = (0, import_react.useId)().replace(/:/g, "");
	const g = `navg-${uid}`;
	const g2 = `navf-${uid}`;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn("rpma-nav-logo inline-flex items-center bg-transparent", className),
		"aria-label": "RPM Assure home",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
			width: 300,
			height: 64,
			viewBox: "0 0 200 42",
			className: "rpma-nav-logo-svg block h-14 w-[min(300px,52vw)] max-w-[300px] bg-transparent sm:h-16 sm:w-[300px]",
			role: "img",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("title", { children: "RPM Assure" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("defs", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
					id: g,
					x1: "0%",
					y1: "0%",
					x2: "100%",
					y2: "100%",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
							offset: "0%",
							stopColor: "#7dd3fc"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
							offset: "40%",
							stopColor: "#1bb8a6"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
							offset: "100%",
							stopColor: "#8fce4a"
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
					id: g2,
					x1: "0%",
					y1: "100%",
					x2: "100%",
					y2: "0%",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
						offset: "0%",
						stopColor: "#1a4d7a"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
						offset: "100%",
						stopColor: "#3ecfbf"
					})]
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("circle", {
					cx: "20",
					cy: "21",
					r: "16",
					fill: "none",
					stroke: `url(#${g})`,
					strokeWidth: "1.2",
					opacity: "0.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("animate", {
						attributeName: "r",
						values: "14;17;14",
						dur: "2.8s",
						repeatCount: "indefinite"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("animate", {
						attributeName: "opacity",
						values: "0.28;0.6;0.28",
						dur: "2.8s",
						repeatCount: "indefinite"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", {
					transform: "translate(6,5) scale(1.35)",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
							d: "M10 16 L2 11.5 L2 5.5 L10 10 Z",
							fill: `url(#${g2})`
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
							d: "M10 16 L18 11.5 L18 5.5 L10 10 Z",
							fill: "#0a2f4a",
							opacity: "0.95"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
							d: "M10 10 L18 5.5 L10 1 L2 5.5 Z",
							fill: `url(#${g})`
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
							d: "M10 1 L18 5.5 L18 11.5 L10 16 L2 11.5 L2 5.5 Z",
							fill: "none",
							stroke: "currentColor",
							className: "rpma-nav-logo-stroke",
							strokeWidth: "0.75",
							opacity: "0.55"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
							cx: "10",
							cy: "8",
							r: "1.5",
							fill: "#ffffff",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("animate", {
								attributeName: "opacity",
								values: "0.65;1;0.65",
								dur: "2.8s",
								repeatCount: "indefinite"
							})
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
					x: "48",
					y: "26",
					className: "rpma-nav-logo-text",
					fill: "currentColor",
					fontFamily: "Inter, Segoe UI, system-ui, sans-serif",
					fontSize: "17",
					fontWeight: "700",
					letterSpacing: "-0.03em",
					children: "RPM Assure"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("rect", {
					x: "48",
					y: "31",
					height: "2",
					rx: "1",
					fill: `url(#${g})`,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("animate", {
						attributeName: "width",
						values: "60;100;60",
						dur: "3.2s",
						repeatCount: "indefinite"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("animate", {
						attributeName: "opacity",
						values: "0.55;0.95;0.55",
						dur: "3.2s",
						repeatCount: "indefinite"
					})]
				})
			]
		})
	});
}
var KEY = "rpma_portfolio_cache_v1";
var TTL_MS = 6e4;
function readClientPortfolioCache() {
	if (typeof sessionStorage === "undefined") return null;
	try {
		const raw = sessionStorage.getItem(KEY);
		if (!raw) return null;
		const box = JSON.parse(raw);
		if (!box?.at || !box?.data) return null;
		if (Date.now() - box.at > TTL_MS) return null;
		return box.data;
	} catch {
		return null;
	}
}
function writeClientPortfolioCache(data) {
	if (typeof sessionStorage === "undefined") return;
	try {
		const box = {
			at: Date.now(),
			data
		};
		sessionStorage.setItem(KEY, JSON.stringify(box));
	} catch {}
}
var RECENT_KEY = "rpma.recentCustomers";
var PIN_KEY = "rpma.pinnedCustomers";
function loadList(key) {
	try {
		const raw = localStorage.getItem(key);
		if (!raw) return [];
		const j = JSON.parse(raw);
		return Array.isArray(j) ? j.map(String) : [];
	} catch {
		return [];
	}
}
function saveList(key, codes) {
	try {
		localStorage.setItem(key, JSON.stringify(codes.slice(0, 12)));
	} catch {}
}
function rememberRecentCustomer(code) {
	saveList(RECENT_KEY, [code, ...loadList(RECENT_KEY).filter((c) => c.toUpperCase() !== code.toUpperCase())]);
}
function CustomerSwitcher({ customers, currentCode, variant = "nav", label = "Customer Ecosystem" }) {
	const [open, setOpen] = (0, import_react.useState)(false);
	const [q, setQ] = (0, import_react.useState)("");
	const [pins, setPins] = (0, import_react.useState)([]);
	const [recents, setRecents] = (0, import_react.useState)([]);
	const [filter, setFilter] = (0, import_react.useState)("all");
	const rootRef = (0, import_react.useRef)(null);
	const spaNav = useSpaNavigate();
	const { dashboard } = useDashboardConfig();
	const inputRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		setPins(loadList(PIN_KEY));
		setRecents(loadList(RECENT_KEY));
	}, []);
	(0, import_react.useEffect)(() => {
		if (!open) return;
		const t = window.setTimeout(() => inputRef.current?.focus(), 30);
		function onDoc(e) {
			if (!rootRef.current?.contains(e.target)) setOpen(false);
		}
		function onKey(e) {
			if (e.key === "Escape") setOpen(false);
		}
		document.addEventListener("mousedown", onDoc);
		document.addEventListener("keydown", onKey);
		return () => {
			window.clearTimeout(t);
			document.removeEventListener("mousedown", onDoc);
			document.removeEventListener("keydown", onKey);
		};
	}, [open]);
	const current = customers.find((c) => c.code.toUpperCase() === (currentCode ?? "").toUpperCase());
	const filtered = (0, import_react.useMemo)(() => {
		let list = [...customers];
		if (filter === "attention") list = list.filter((c) => c.needsAttention);
		if (filter === "red") list = list.filter((c) => c.healthRag === "Red");
		if (filter === "amber") list = list.filter((c) => c.healthRag === "Amber");
		const qq = q.trim().toLowerCase();
		if (qq) list = list.filter((c) => c.name.toLowerCase().includes(qq) || c.code.toLowerCase().includes(qq));
		const pinSet = new Set(pins.map((p) => p.toUpperCase()));
		list.sort((a, b) => {
			const ap = pinSet.has(a.code.toUpperCase()) ? 0 : 1;
			const bp = pinSet.has(b.code.toUpperCase()) ? 0 : 1;
			if (ap !== bp) return ap - bp;
			const ar = a.healthRag === "Red" ? 0 : a.healthRag === "Amber" ? 1 : 2;
			const br = b.healthRag === "Red" ? 0 : b.healthRag === "Amber" ? 1 : 2;
			if (ar !== br) return ar - br;
			return a.name.localeCompare(b.name, "en-ZA");
		});
		return list;
	}, [
		customers,
		q,
		filter,
		pins
	]);
	const recentRows = (0, import_react.useMemo)(() => {
		return recents.map((code) => customers.find((c) => c.code.toUpperCase() === code.toUpperCase())).filter(Boolean);
	}, [recents, customers]);
	function go(code) {
		rememberRecentCustomer(code);
		setOpen(false);
		setQ("");
		const base = `/customers/${encodeURIComponent(code)}`;
		const landing = dashboard.customerLanding === "syspro" ? `${base}/syspro` : dashboard.customerLanding === "ams" ? `${base}/ams` : base;
		spaNav(landing);
	}
	function togglePin(code, e) {
		e.preventDefault();
		e.stopPropagation();
		setPins((prev) => {
			const up = code.toUpperCase();
			const next = prev.some((p) => p.toUpperCase() === up) ? prev.filter((p) => p.toUpperCase() !== up) : [code, ...prev];
			saveList(PIN_KEY, next);
			return next;
		});
	}
	const isEcosystem = variant === "ecosystem";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		ref: rootRef,
		className: cn("relative", variant === "inline" && "w-full max-w-md", isEcosystem && "w-full"),
		children: [
			isEcosystem ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-1.5 flex flex-wrap items-center justify-between gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Building2, {
							className: "h-4 w-4 text-accent",
							"aria-hidden": true
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-sm font-bold tracking-tight text-fg",
							children: label
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-muted",
							children: customers.length
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-[11px] text-subtle",
					children: "Jump to a customer workspace"
				})]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				className: cn(variant === "nav" && "rpma-top-link inline-flex max-w-[14rem] items-center gap-1.5", variant === "inline" && "rpma-switcher-inline rpma-saas-switcher", isEcosystem && "rpma-ecosystem-dd-trigger flex w-full items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 text-left shadow-sm transition hover:border-accent/40 hover:bg-surface-2/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40", open && variant === "nav" && "rpma-top-link-active", open && isEcosystem && "border-accent/50 ring-2 ring-accent/20"),
				"aria-expanded": open,
				"aria-haspopup": "listbox",
				"aria-label": isEcosystem ? `${label}: select customer` : void 0,
				onClick: () => setOpen((v) => !v),
				children: [
					!isEcosystem ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Building2, { className: "h-3.5 w-3.5 shrink-0 opacity-90" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
						className: "h-4 w-4 shrink-0 text-muted",
						"aria-hidden": true
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: cn("min-w-0 flex-1 truncate", isEcosystem && "text-sm font-medium"),
						children: current ? current.name : isEcosystem ? "Select a customer…" : "Select customer"
					}),
					current ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: cn(!isEcosystem && "hidden sm:inline"),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RagBadge, { rag: current.healthRag })
					}) : isEcosystem ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "hidden text-[11px] text-subtle sm:inline",
						children: "Search or browse"
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: cn("h-3.5 w-3.5 shrink-0 opacity-80 transition", isEcosystem && "h-4 w-4 text-muted", open && "rotate-180") })
				]
			}),
			open ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: cn("rpma-glass-dropdown absolute z-50 mt-1.5 overflow-hidden", variant === "nav" && "left-0 top-full w-[min(92vw,22rem)]", variant === "inline" && "left-0 top-full w-[min(92vw,22rem)]", isEcosystem && "left-0 right-0 top-full w-full max-w-none sm:max-w-xl"),
				role: "listbox",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "border-b border-border/70 p-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2 rounded-lg border border-border bg-bg/80 px-2 py-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "h-3.5 w-3.5 text-muted" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								ref: inputRef,
								value: q,
								onChange: (e) => setQ(e.target.value),
								placeholder: "Search customers…",
								className: "min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-subtle",
								"aria-label": "Search customers"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-2 flex flex-wrap gap-1",
							children: [
								["all", "All"],
								["attention", "Attention"],
								["red", "Red"],
								["amber", "Amber"]
							].map(([k, lab]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition", filter === k ? "bg-accent text-accent-fg" : "bg-surface-2 text-muted hover:bg-accent-soft hover:text-accent"),
								onClick: () => setFilter(k),
								children: lab
							}, k))
						})]
					}),
					recentRows.length > 0 && !q ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "border-b border-border/60 px-2 py-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-subtle",
							children: "Recent"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex flex-wrap gap-1",
							children: recentRows.slice(0, 5).map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "rounded-md border border-border bg-surface px-2 py-0.5 text-[11px] font-medium text-fg transition hover:border-accent/40",
								onClick: () => go(c.code),
								children: c.name.length > 18 ? c.code : c.name
							}, c.code))
						})]
					}) : null,
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "max-h-[min(50vh,18rem)] overflow-y-auto py-1",
						children: filtered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
							className: "px-3 py-4 text-center text-sm text-muted",
							children: "No matching customers."
						}) : filtered.map((c) => {
							const pinned = pins.some((p) => p.toUpperCase() === c.code.toUpperCase());
							const active = currentCode?.toUpperCase() === c.code.toUpperCase();
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: cn("flex items-center gap-1 px-1.5 py-0.5", active && "bg-accent-soft"),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "min-w-0 flex-1 rounded-md px-2 py-1.5 text-left transition hover:bg-accent-soft",
									onClick: () => go(c.code),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "flex items-center gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RagBadge, { rag: c.healthRag }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "min-w-0 flex-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "block truncate text-sm font-semibold text-fg",
												children: c.name
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "block text-[10px] text-subtle",
												children: [c.code, c.collectFresh === false ? " · Collect stale / missing" : c.needsAttention ? " · Needs attention" : ""]
											})]
										})]
									})
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "rounded p-1.5 text-subtle transition hover:bg-surface-2 hover:text-accent",
									"aria-label": pinned ? "Unpin" : "Pin",
									onClick: (e) => togglePin(c.code, e),
									children: pinned ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Star, { className: "h-3.5 w-3.5 fill-current text-rag-amber" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pin, { className: "h-3.5 w-3.5" })
								})]
							}) }, c.code);
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "border-t border-border/70 px-3 py-2 text-[10px] text-subtle",
						children: "Opens Customer Ecosystem for the selected customer."
					})
				]
			}) : null
		]
	});
}
function isNavActive(pathname, node) {
	if (!node.href) return false;
	if (node.match === "exact") return pathname === node.href || pathname === node.href + "/";
	if (node.match === "prefix") {
		if (pathname === node.href || pathname === node.href + "/") return true;
		return pathname.startsWith(node.href + "/");
	}
	return pathname === node.href;
}
var TZ = "Africa/Johannesburg";
/** Live system clock — DD/MM/YYYY HH:mm:ss (SAST) */
function formatSystemNow(d) {
	const parts = new Intl.DateTimeFormat("en-GB", {
		timeZone: TZ,
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false
	}).formatToParts(d);
	const get = (type) => parts.find((p) => p.type === type)?.value ?? "";
	return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")}:${get("second")}`;
}
function SystemClock({ className }) {
	const [now, setNow] = (0, import_react.useState)(() => formatSystemNow(/* @__PURE__ */ new Date()));
	(0, import_react.useEffect)(() => {
		const tick = () => setNow(formatSystemNow(/* @__PURE__ */ new Date()));
		tick();
		const id = window.setInterval(tick, 1e3);
		return () => window.clearInterval(id);
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("rpma-system-clock flex flex-col items-start justify-center leading-tight", className),
		title: "System time (Africa/Johannesburg)",
		"aria-live": "polite",
		"aria-atomic": "true",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-[9px] font-bold uppercase tracking-[0.12em] text-white/55",
			children: "System time"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("time", {
			dateTime: (/* @__PURE__ */ new Date()).toISOString(),
			className: "font-mono text-[12px] font-semibold tabular-nums tracking-tight text-white/95 sm:text-[13px]",
			children: now
		})]
	});
}
var DropdownMenu = Root2;
var DropdownMenuTrigger = Trigger;
function DropdownMenuContent({ className, sideOffset = 6, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Portal2, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2, {
		sideOffset,
		className: cn("rpma-dd-menu z-[80] min-w-[12rem] overflow-hidden rounded-lg border border-border bg-surface p-1 text-fg shadow-elevated", "data-[state=open]:animate-in data-[state=closed]:animate-out", className),
		...props
	}) });
}
function DropdownMenuItem({ className, inset, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Item2, {
		className: cn("relative flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-1.5 text-sm outline-none", "focus:bg-accent-soft focus:text-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50", inset && "pl-8", className),
		...props
	});
}
function DropdownMenuLabel({ className, inset, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label2, {
		className: cn("px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-subtle", inset && "pl-8", className),
		...props
	});
}
function DropdownMenuSeparator({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator2, {
		className: cn("-mx-1 my-1 h-px bg-border", className),
		...props
	});
}
/**
* App shell — top navigation bar.
* No hamburger menu; logo + primary links left-centered in bar.
*/
function AppShell({ children, title, subtitle }) {
	const [settingsOpen, setSettingsOpen] = (0, import_react.useState)(false);
	const [reportsOpen, setReportsOpen] = (0, import_react.useState)(false);
	const [switcherCustomers, setSwitcherCustomers] = (0, import_react.useState)([]);
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const router = useRouter();
	const { isCompact } = useDensity();
	const { profile } = useStaffProfile();
	profile?.permissions.canAccessPlatformSettings;
	const navRef = (0, import_react.useRef)(null);
	useIdleLogout();
	const currentCustomerCode = (0, import_react.useMemo)(() => {
		const m = pathname.match(/^\/customers\/([^/]+)/);
		return m ? decodeURIComponent(m[1]) : null;
	}, [pathname]);
	(0, import_react.useEffect)(() => {
		if (currentCustomerCode) rememberRecentCustomer(currentCustomerCode);
	}, [currentCustomerCode]);
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		function mapRows(p) {
			if (!p) return [];
			const boards = p.exco?.boards ?? [];
			const boardBy = new Map(boards.map((b) => [b.customerCode.toUpperCase(), b]));
			let rows = p.customers ?? p.rows ?? [];
			const allowed = profile?.allowedCustomerCodes;
			if (allowed && allowed.length > 0) {
				const set = new Set(allowed.map((c) => c.toUpperCase()));
				rows = rows.filter((r) => set.has(r.customerCode.toUpperCase()));
			}
			return rows.filter((r) => Boolean(r.sqlInstanceName && String(r.sqlInstanceName).trim()) || (r.operatorCount ?? 0) > 0 || (r.pulsewayDeviceCount ?? 0) > 0 || (r.pulsewayOfflineCount ?? 0) > 0 || Boolean(r.pulsewayOrgName && String(r.pulsewayOrgName).trim()) || (r.coveDeviceCount ?? 0) > 0).map((r) => {
				const b = boardBy.get(r.customerCode.toUpperCase());
				return {
					code: r.customerCode,
					name: (r.displayName || r.customerCode).trim(),
					healthRag: r.healthRag,
					needsAttention: (b?.attentionReasons?.length ?? 0) > 0 || r.healthRag !== "Green",
					collectFresh: b?.collectFresh ?? !!r.lastImportAt
				};
			}).sort((a, b) => a.name.localeCompare(b.name, "en-ZA"));
		}
		const cached = readClientPortfolioCache();
		if (cached) setSwitcherCustomers(mapRows(cached));
		fetchPortfolio().then((p) => {
			if (cancelled) return;
			writeClientPortfolioCache(p);
			setSwitcherCustomers(mapRows(p));
		}).catch(() => {});
		return () => {
			cancelled = true;
		};
	}, [profile?.allowedCustomerCodes]);
	function linkActive(href, match) {
		return isNavActive(pathname, {
			id: href,
			label: "",
			href,
			match
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rpma-topnav-shell flex min-h-dvh flex-col bg-bg text-fg",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			ref: navRef,
			className: "rpma-topnav sticky top-0 z-50 border-b border-border/80",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rpma-topnav-inner mx-auto flex w-full max-w-[1600px] items-center gap-3 px-3 sm:gap-4 sm:px-4 lg:px-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rpma-topnav-left flex min-w-0 flex-1 items-center gap-3 sm:gap-5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/",
						className: "rpma-topnav-brand rpma-focus shrink-0 rounded-lg",
						"aria-label": "RPM Assure — Assure App",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RpmAssureNavLogo, {})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
						className: "rpma-topnav-primary flex min-w-0 flex-wrap items-center gap-1",
						"aria-label": "Main",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SpaLink, {
								href: "/",
								className: cn("rpma-topnav-link", linkActive("/", "exact") && "rpma-topnav-link-active"),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LayoutDashboard, { className: "h-3.5 w-3.5 shrink-0 opacity-90" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Exco Insight" })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenu, {
								open: reportsOpen,
								onOpenChange: (o) => {
									setReportsOpen(o);
									if (o) setSettingsOpen(false);
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuTrigger, {
									asChild: true,
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										className: cn("rpma-topnav-link", pathname.startsWith("/reports") && "rpma-topnav-link-active"),
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, { className: "h-3.5 w-3.5 shrink-0 opacity-90" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Reports" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "h-3 w-3 opacity-70" })
										]
									})
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuContent, {
									align: "start",
									className: "w-56",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuLabel, { children: "Reports" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuItem, {
											asChild: true,
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SpaLink, {
												href: "/reports",
												onClick: () => setReportsOpen(false),
												children: "Open Reports"
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuSeparator, {}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuLabel, { children: "Quick packs" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuItem, {
											asChild: true,
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SpaLink, {
												href: "/reports?format=day-end",
												onClick: () => setReportsOpen(false),
												children: "Day end · FinSight"
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuItem, {
											asChild: true,
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SpaLink, {
												href: "/reports?format=period-end",
												onClick: () => setReportsOpen(false),
												children: "Period end · FinSight"
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuItem, {
											asChild: true,
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SpaLink, {
												href: "/reports?format=ams-full",
												onClick: () => setReportsOpen(false),
												children: "Applications AMS"
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuItem, {
											asChild: true,
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SpaLink, {
												href: "/reports?format=estate",
												onClick: () => setReportsOpen(false),
												children: "Estate overview"
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuSeparator, {}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuItem, {
											asChild: true,
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SpaLink, {
												href: "/reports?format=custom-pack",
												onClick: () => setReportsOpen(false),
												children: "Custom report"
											})
										})
									]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mx-0.5 hidden h-5 w-px shrink-0 bg-white/15 sm:block",
								"aria-hidden": true
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CustomerSwitcher, {
								customers: switcherCustomers,
								currentCode: currentCustomerCode
							}),
							null
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rpma-topnav-right ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SystemClock, { className: "hidden md:flex" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThemeToggle, { compact: true }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "hidden sm:block",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DensityToggle, { compact: true })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "rpma-topnav-iconbtn",
							"aria-label": "Refresh data",
							title: "Refresh",
							onClick: () => {
								try {
									sessionStorage.removeItem("rpma_portfolio_cache_v1");
								} catch {}
								router.invalidate();
							},
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: "h-3.5 w-3.5" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "rpma-topnav-user",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserButton, {})
						})
					]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "rpma-topnav-titlebar border-t border-border/60",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto flex w-full max-w-[1600px] items-center gap-2 px-3 py-2 sm:px-4 lg:px-5",
					children: [pathname.startsWith("/reports") ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, { className: "hidden h-4 w-4 shrink-0 text-accent sm:block" }) : pathname.startsWith("/settings") ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings, { className: "hidden h-4 w-4 shrink-0 text-accent sm:block" }) : pathname.startsWith("/customers") ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Building2, { className: "hidden h-4 w-4 shrink-0 text-accent sm:block" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LayoutDashboard, { className: "hidden h-4 w-4 shrink-0 text-accent sm:block" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "truncate text-[15px] font-bold tracking-tight text-fg sm:text-base",
							children: title
						}), subtitle ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "truncate text-[11px] text-muted",
							children: subtitle
						}) : null]
					})]
				})
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
			className: cn("rpma-topnav-main flex-1 overflow-x-hidden", isCompact ? "p-3 md:p-4" : "p-3.5 md:p-5"),
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "rpma-topnav-canvas mx-auto w-full max-w-[1600px]",
				children
			})
		})]
	});
}
//#endregion
export { RequireAuth as n, AppShell as t };
