import { o as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { v as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { t as cn } from "./utils-BpkUUAOs.mjs";
import { t as authClient } from "./client-GruXRyhu.mjs";
import { n as useCurrentUserState } from "./use-current-user-CsON5Gdz.mjs";
import { t as IdleLogoutBanner } from "./idle-logout-CvUgb-Vj.mjs";
import { B as Eye, O as Lock, V as EyeOff, r as User } from "../_libs/lucide-react.mjs";
import { n as normalizeLoginIdentifier } from "./root-admin-vQ7nqsRE.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/login-eAoord6N.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/**
* RPM Assure cube mark — pure vector SVG (never a bitmap).
* Keep display size modest (~96–128px); large sizes look “blown up” because
* paths are simple, not photoreal art.
*/
function RpmAssureMark({ className, size = 112, showWordmark = true, staticMark = false }) {
	const uid = (0, import_react.useId)().replace(/:/g, "");
	const gCube = `gc-${uid}`;
	const gFace = `gf-${uid}`;
	const px = Math.max(48, Math.round(size));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("mx-auto flex flex-col items-center justify-center text-center", className),
		style: {
			width: "max-content",
			maxWidth: "100%"
		},
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex shrink-0 items-center justify-center",
			style: {
				width: px,
				height: px
			},
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
				width: px,
				height: px,
				viewBox: "0 0 120 120",
				className: "block h-auto w-auto max-w-none",
				role: "img",
				"aria-label": "RPM Assure",
				style: {
					display: "block",
					width: px,
					height: px,
					maxWidth: "none",
					shapeRendering: "geometricPrecision"
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("defs", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
						id: gCube,
						x1: "15%",
						y1: "10%",
						x2: "90%",
						y2: "90%",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
								offset: "0%",
								stopColor: "#2b6fae"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
								offset: "55%",
								stopColor: "#1bb8a6"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
								offset: "100%",
								stopColor: "#8fce4a"
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
						id: gFace,
						x1: "0%",
						y1: "0%",
						x2: "100%",
						y2: "100%",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
							offset: "0%",
							stopColor: "#3ecfbf"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
							offset: "100%",
							stopColor: "#2b6fae"
						})]
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
						cx: "60",
						cy: "56",
						r: "48",
						fill: "none",
						stroke: "#1bb8a6",
						strokeWidth: "1.25",
						opacity: "0.35",
						children: !staticMark ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("animate", {
							attributeName: "r",
							values: "46;52;46",
							dur: "3.2s",
							repeatCount: "indefinite"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("animate", {
							attributeName: "opacity",
							values: "0.2;0.45;0.2",
							dur: "3.2s",
							repeatCount: "indefinite"
						})] }) : null
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
						cx: "60",
						cy: "56",
						r: "42",
						fill: "none",
						stroke: `url(#${gCube})`,
						strokeWidth: "1.5",
						opacity: "0.5"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
							d: "M60 80 L30 63 L30 37 L60 54 Z",
							fill: `url(#${gFace})`
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
							d: "M60 80 L90 63 L90 37 L60 54 Z",
							fill: "#1a4d7a"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
							d: "M60 54 L90 37 L60 20 L30 37 Z",
							fill: `url(#${gCube})`
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
							d: "M60 20 L90 37 L90 63 L60 80 L30 63 L30 37 Z",
							fill: "none",
							stroke: "#ffffff",
							strokeWidth: "1.4",
							opacity: "0.7"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
							d: "M60 54 L60 80",
							stroke: "#ffffff",
							strokeWidth: "1.2",
							opacity: "0.5"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
							d: "M60 54 L90 37",
							stroke: "#ffffff",
							strokeWidth: "1.2",
							opacity: "0.45"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
							d: "M60 54 L30 37",
							stroke: "#ffffff",
							strokeWidth: "1.2",
							opacity: "0.45"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
							cx: "60",
							cy: "47",
							r: "4.2",
							fill: "#ffffff"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
							cx: "60",
							cy: "47",
							r: "7.5",
							fill: "none",
							stroke: "#1bb8a6",
							strokeWidth: "1.5",
							opacity: "0.85"
						})
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", {
						fill: "none",
						strokeLinecap: "round",
						strokeLinejoin: "round",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
								d: "M14 42 H28 M14 42 V32",
								stroke: "#8fce4a",
								strokeWidth: "2"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
								d: "M106 70 H92 M106 70 V80",
								stroke: "#1bb8a6",
								strokeWidth: "2"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
								d: "M20 88 H38 L44 82",
								stroke: "#2b6fae",
								strokeWidth: "2"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
								d: "M100 28 H82 L76 34",
								stroke: "#3ecfbf",
								strokeWidth: "2"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
								cx: "14",
								cy: "42",
								r: "2.5",
								fill: "#8fce4a"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
								cx: "106",
								cy: "70",
								r: "2.5",
								fill: "#1bb8a6"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
								cx: "20",
								cy: "88",
								r: "2.2",
								fill: "#2b6fae"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
								cx: "100",
								cy: "28",
								r: "2.2",
								fill: "#3ecfbf"
							})
						]
					})
				]
			})
		}), showWordmark ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-5 w-full text-center",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "rpma-login-wordmark m-0 text-[1.5rem] font-bold leading-none tracking-tight text-white sm:text-[1.65rem]",
				style: {
					color: "#ffffff",
					WebkitTextFillColor: "#ffffff"
				},
				children: "RPM Assure"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "rpma-login-tagline mt-2 m-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70",
				children: "Assurance Delivered"
			})]
		}) : null]
	});
}
/** Restored pre-examples login: floating PS / SQL / Linux / macOS + glass card */
var LOGIN_BUILD = "restore-four-win-20260811";
function FloatWin({ variant, pos, title, lines }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `rpma-login-fwin rpma-login-fwin--${variant} rpma-login-fwin--${pos}`,
		"aria-hidden": "true",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rpma-login-fwin-bar",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "rpma-login-fwin-dots",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "rpma-login-fwin-title",
				children: title
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "rpma-login-fwin-body",
			children: lines.map((ln, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: ln.kind === "prompt" ? "is-prompt" : ln.kind === "ok" ? "is-ok" : ln.kind === "comment" ? "is-comment" : ln.kind === "kw" ? "is-kw" : void 0,
				children: ln.text
			}, i))
		})]
	});
}
var PS_LINES = [
	{
		text: "PS C:\\Scripts> Get-Service | ? Status -eq Running",
		kind: "prompt"
	},
	{
		text: "Status  Name       DisplayName",
		kind: "ok"
	},
	{ text: "Running WinRM      Windows Remote Management" },
	{ text: "Running EventLog   Windows Event Log" },
	{
		text: "PS C:\\Scripts> .\\Invoke-HealthCheck.ps1",
		kind: "prompt"
	},
	{
		text: ">> Result: Healthy",
		kind: "ok"
	},
	{
		text: "PS C:\\Scripts> _",
		kind: "prompt"
	}
];
var SQL_LINES = [
	{
		text: "-- RPM reports snapshot",
		kind: "comment"
	},
	{
		text: "SELECT CustomerCode, COUNT(*) AS Devices",
		kind: "kw"
	},
	{
		text: "FROM   dbo.Pulseway_Devices",
		kind: "kw"
	},
	{
		text: "WHERE  SnapshotDate = CAST(GETDATE() AS date)",
		kind: "kw"
	},
	{
		text: "GROUP BY CustomerCode;",
		kind: "kw"
	},
	{
		text: "/* 12 rows affected */",
		kind: "comment"
	},
	{
		text: "GO",
		kind: "ok"
	}
];
var LINUX_LINES = [
	{
		text: "admin@srv01:~$ uptime",
		kind: "prompt"
	},
	{
		text: " 12:04:11 up 42 days,  3:18,  2 users",
		kind: "ok"
	},
	{
		text: "admin@srv01:~$ df -h /",
		kind: "prompt"
	},
	{
		text: "Filesystem  Size  Used  Avail  Use%",
		kind: "ok"
	},
	{
		text: "/dev/sda1    100G   42G    53G   44%",
		kind: "ok"
	},
	{
		text: "admin@srv01:~$ _",
		kind: "prompt"
	}
];
var MAC_LINES = [
	{
		text: "admin@MacBook-Pro ~ % sw_vers",
		kind: "prompt"
	},
	{
		text: "ProductName:		macOS",
		kind: "ok"
	},
	{
		text: "ProductVersion:	14.5",
		kind: "ok"
	},
	{
		text: "admin@MacBook-Pro ~ % whoami",
		kind: "prompt"
	},
	{
		text: "admin",
		kind: "ok"
	},
	{
		text: "admin@MacBook-Pro ~ % _",
		kind: "prompt"
	}
];
function LoginPage() {
	const navigate = useNavigate();
	const { user, isPending } = useCurrentUserState();
	const [username, setUsername] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)(null);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [showPw, setShowPw] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (!isPending && user) navigate({ to: "/" });
	}, [
		isPending,
		user,
		navigate
	]);
	async function onSubmit(e) {
		e.preventDefault();
		setError(null);
		setBusy(true);
		try {
			const u = username.trim();
			if (!u) throw new Error("Enter your username.");
			if (password.length < 8) throw new Error("Password must be at least 8 characters.");
			const email = u.includes("@") ? u.toLowerCase() : normalizeLoginIdentifier(u);
			if (!email) throw new Error("Enter username or email.");
			const res = await authClient.signIn.email({
				email,
				password
			});
			if (res.error) {
				const raw = res.error.message || res.error.statusText || "Sign-in failed";
				if (/invalid|credential|password|user/i.test(raw)) throw new Error("Invalid username or password.");
				throw new Error(raw);
			}
			await navigate({ to: "/" });
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			if (/fetch|network|Failed to fetch/i.test(message)) setError(message + " — check the app is running.");
			else setError(message);
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rpma-login-hero",
		"data-login-build": LOGIN_BUILD,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: `
/* Restore original float-window visibility (pre-examples) */
.rpma-login-hero .rpma-login-fwin {
  opacity: 0.78 !important;
  mix-blend-mode: normal !important;
  filter: none !important;
}
.rpma-login-hero .rpma-login-ps-stage {
  z-index: 1 !important;
}
.rpma-login-hero .rpma-login-hero-center {
  z-index: 5 !important;
}
` }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "rpma-login-hero-bg",
				"aria-hidden": "true"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "rpma-login-hero-grid",
				"aria-hidden": "true"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "rpma-login-hero-glow",
				"aria-hidden": "true"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rpma-login-ps-stage",
				"aria-hidden": "true",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FloatWin, {
						variant: "ps",
						pos: "tl",
						title: "Windows PowerShell",
						lines: PS_LINES
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FloatWin, {
						variant: "sql",
						pos: "tr",
						title: "SQL Server Management Studio",
						lines: SQL_LINES
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FloatWin, {
						variant: "linux",
						pos: "bl",
						title: "bash — admin@srv01",
						lines: LINUX_LINES
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FloatWin, {
						variant: "macos",
						pos: "br",
						title: "Terminal — zsh",
						lines: MAC_LINES
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rpma-login-hero-center",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rpma-login-hero-brand",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "rpma-login-hero-mark",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RpmAssureMark, {
								size: 88,
								showWordmark: false,
								staticMark: true
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
							className: "rpma-login-hero-title",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "rpma-login-hero-rpm",
								children: "RPM "
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "rpma-login-hero-assure",
								children: "Assure"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "rpma-login-hero-tag",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "rpma-login-hero-tag-line",
								children: "Assurance Delivered"
							})
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rpma-login-glass",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "rpma-login-glass-title",
							children: "Sign in"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "rpma-login-glass-sub",
							children: "Use your staff username and password"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IdleLogoutBanner, {}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
							className: "rpma-login-glass-form",
							onSubmit,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "rpma-login-field",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "rpma-login-field-label",
										children: "Username"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "rpma-login-field-wrap",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(User, {
											size: 16,
											className: "rpma-login-field-icon",
											"aria-hidden": true
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "text",
											required: true,
											autoComplete: "username",
											placeholder: "Enter your username",
											value: username,
											onChange: (e) => setUsername(e.target.value)
										})]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "rpma-login-field",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "rpma-login-field-label",
										children: "Password"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "rpma-login-field-wrap",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, {
												size: 16,
												className: "rpma-login-field-icon",
												"aria-hidden": true
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: showPw ? "text" : "password",
												required: true,
												minLength: 8,
												autoComplete: "current-password",
												placeholder: "Enter your password",
												value: password,
												onChange: (e) => setPassword(e.target.value)
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												className: "rpma-login-field-eye",
												onClick: () => setShowPw((v) => !v),
												"aria-label": showPw ? "Hide password" : "Show password",
												tabIndex: -1,
												children: showPw ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EyeOff, { size: 16 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { size: 16 })
											})
										]
									})]
								}),
								error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "rpma-login-glass-error",
									children: error
								}) : null,
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "submit",
									className: "rpma-login-glass-submit",
									disabled: busy,
									children: busy ? "Signing in..." : "Sign in"
								})
							]
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "rpma-login-hero-footer",
				children: "Powered by RPM Resources"
			})
		]
	});
}
//#endregion
export { LoginPage as component };
