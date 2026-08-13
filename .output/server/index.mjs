globalThis.__nitro_main__ = import.meta.url;
import { a as serve, i as NodeResponse } from "./_libs/h3-v2+rou3+srvx.mjs";
import { a as toEventHandler, i as defineLazyEventHandler, n as HTTPError, r as defineHandler, t as H3Core } from "./_libs/h3+rou3+srvx.mjs";
import { i as withoutTrailingSlash, n as joinURL, r as withLeadingSlash, t as decodePath } from "./_libs/ufo.mjs";
import { promises } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
//#region #nitro-vite-setup
function lazyService(loader) {
	let promise, mod;
	return { fetch(req) {
		if (mod) return mod.fetch(req);
		if (!promise) promise = loader().then((_mod) => mod = _mod.default || _mod);
		return promise.then((mod) => mod.fetch(req));
	} };
}
var services = { ["ssr"]: lazyService(() => import("./_ssr/ssr.mjs").then((n) => n.i)) };
globalThis.__nitro_vite_envs__ = services;
//#endregion
//#region node_modules/nitro/dist/runtime/internal/route-rules.mjs
var headers = ((m) => function headersRouteRule(event) {
	for (const [key, value] of Object.entries(m.options || {})) event.res.headers.set(key, value);
});
//#endregion
//#region #nitro/virtual/public-assets-data
var public_assets_data_default = {
	"/assets/app-shell-BkbQOl_d.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1b226-UyrgvqB+PMtnSUsAKZ0CR3IyZkc\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 111142,
		"path": "../public/assets/app-shell-BkbQOl_d.js"
	},
	"/assets/brand-colors-C4MicOq8.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5bc6c-ggXqibbk6YNBZ8Oijon2zAWeeYk\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 375916,
		"path": "../public/assets/brand-colors-C4MicOq8.js"
	},
	"/assets/badge-DiFOKYwe.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"335-j4yHJHcm3c1STJzdOBzl9TrYoX8\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 821,
		"path": "../public/assets/badge-DiFOKYwe.js"
	},
	"/assets/button-DmVCdzlw.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e6d-9g0ZkOAXU9JGZ+NAFT35cbmPBMs\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 3693,
		"path": "../public/assets/button-DmVCdzlw.js"
	},
	"/assets/card-7AA3c4BU.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"276-zWZSFCK1ya7mJKiFAx6i6Peoro8\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 630,
		"path": "../public/assets/card-7AA3c4BU.js"
	},
	"/assets/client-DtKb35Co.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7871-BQXys4oJAM6SvkG+Lqv+eZtsriE\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 30833,
		"path": "../public/assets/client-DtKb35Co.js"
	},
	"/assets/createLucideIcon-ChDqWVJv.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4a2-Csy76ou4/3vVD7iVgAN3YZ3XDCI\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 1186,
		"path": "../public/assets/createLucideIcon-ChDqWVJv.js"
	},
	"/assets/createServerFn-C-qJG2ZB.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"92c9-qB1STgiQ/mlB+5VCtAJolobyirU\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 37577,
		"path": "../public/assets/createServerFn-C-qJG2ZB.js"
	},
	"/assets/customer-sections-CFEgpO4P.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2480f-/zEwhT/tyNiPIjvs6026M/AHkuI\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 149519,
		"path": "../public/assets/customer-sections-CFEgpO4P.js"
	},
	"/assets/customers._code-BZh2-eNk.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2d81-duU3jIL9QfS6o5TJ6YXlmy1Q7lQ\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 11649,
		"path": "../public/assets/customers._code-BZh2-eNk.js"
	},
	"/assets/customers._code.ams-DLUtf4wg.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"8d-3GOZRdFTySW9+F8OuOD7Nr67Mss\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 141,
		"path": "../public/assets/customers._code.ams-DLUtf4wg.js"
	},
	"/assets/customers._code.ams.change-R3uTp38z.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"17a-uLRjNooOZLna7oT3vh3DftQWybw\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 378,
		"path": "../public/assets/customers._code.ams.change-R3uTp38z.js"
	},
	"/assets/customers._code.ams.index-BYfpAMPu.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"17f-Aw54TUQ6Hvib4cgBP6JOGiPZyNs\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 383,
		"path": "../public/assets/customers._code.ams.index-BYfpAMPu.js"
	},
	"/assets/customers._code.ams.incidents-BYnD0g62.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"17f-bZ8T0Cp0nXFHcXxAO+xOFzObOkQ\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 383,
		"path": "../public/assets/customers._code.ams.incidents-BYnD0g62.js"
	},
	"/assets/customers._code.ams.risks-BVcKPcl2.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"17f-+ZBSd5PU3zZnpjpEw+qtDXnfsbM\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 383,
		"path": "../public/assets/customers._code.ams.risks-BVcKPcl2.js"
	},
	"/assets/customers._code.ams.sla-BeCJeFbZ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"17f-UVKvRjrpfTPioJrApWZTQ0jZWPE\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 383,
		"path": "../public/assets/customers._code.ams.sla-BeCJeFbZ.js"
	},
	"/assets/customers._code.cove-DLUtf4wg.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"8d-3GOZRdFTySW9+F8OuOD7Nr67Mss\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 141,
		"path": "../public/assets/customers._code.cove-DLUtf4wg.js"
	},
	"/assets/customers._code.cove.devices-p6r_4bch.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"17f-D8oJGcG1CjMI9O7If0cn9mLTtpI\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 383,
		"path": "../public/assets/customers._code.cove.devices-p6r_4bch.js"
	},
	"/assets/customers._code.cove.index-p6r_4bch.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"17f-D8oJGcG1CjMI9O7If0cn9mLTtpI\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 383,
		"path": "../public/assets/customers._code.cove.index-p6r_4bch.js"
	},
	"/assets/customers._code.cove.mapping-CHjGEtJ0.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"17f-J021Yu2NEKmUnW6A4rQ0Yr0p1bw\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 383,
		"path": "../public/assets/customers._code.cove.mapping-CHjGEtJ0.js"
	},
	"/assets/customers._code.cove.overview-BcrmDWLD.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"14e-hcrsCPa7MMEzMx2z7+VL1Fyb+JU\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 334,
		"path": "../public/assets/customers._code.cove.overview-BcrmDWLD.js"
	},
	"/assets/customers._code.cove.recovery-llXoED2f.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"13b-lVL0HtjDoNcids2YqUN1+qubzz4\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 315,
		"path": "../public/assets/customers._code.cove.recovery-llXoED2f.js"
	},
	"/assets/customers._code.cove.retention-7TUeYRP5.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"14e-1lZ15Tq70LWjAjK8OUKbDfFHoss\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 334,
		"path": "../public/assets/customers._code.cove.retention-7TUeYRP5.js"
	},
	"/assets/customers._code.csp-DLUtf4wg.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"8d-3GOZRdFTySW9+F8OuOD7Nr67Mss\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 141,
		"path": "../public/assets/customers._code.csp-DLUtf4wg.js"
	},
	"/assets/customers._code.csp.index-DbUcnnna.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"357-0Ar+WPrCesifB7NBI/8Bo7bIMyo\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 855,
		"path": "../public/assets/customers._code.csp.index-DbUcnnna.js"
	},
	"/assets/customers._code.csp.licenses-BpBGY4rN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2b5-9Q/ySvlMQ38RGc/UphuoSKo7ruc\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 693,
		"path": "../public/assets/customers._code.csp.licenses-BpBGY4rN.js"
	},
	"/assets/customers._code.csp.users-CKOEVeSr.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2b8-ryZ5nKCsirNHVsw3lBbUqpc/chE\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 696,
		"path": "../public/assets/customers._code.csp.users-CKOEVeSr.js"
	},
	"/assets/customers._code.epp.incidents-BduMkIeO.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"b27-Df/qqo3gqpA8T60irowcmiwv8FA\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 2855,
		"path": "../public/assets/customers._code.epp.incidents-BduMkIeO.js"
	},
	"/assets/customers._code.epp.index-CoGVvmp-.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"fba-iHubd72Qt3GTS3VzdjGEEejOgCc\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 4026,
		"path": "../public/assets/customers._code.epp.index-CoGVvmp-.js"
	},
	"/assets/customers._code.epp-DLUtf4wg.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"8d-3GOZRdFTySW9+F8OuOD7Nr67Mss\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 141,
		"path": "../public/assets/customers._code.epp-DLUtf4wg.js"
	},
	"/assets/customers._code.epp.modules-tJKe6GCm.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"62c-Ze9xA5vz2rYOZIEK590vegqmY+M\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 1580,
		"path": "../public/assets/customers._code.epp.modules-tJKe6GCm.js"
	},
	"/assets/customers._code.epp.quarantine-2LagPyll.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a9b-WUJhQ38HlLLISkPWQWtuX9mPrjk\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 2715,
		"path": "../public/assets/customers._code.epp.quarantine-2LagPyll.js"
	},
	"/assets/customers._code.index-DTVvALXX.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e7-NkUEheEoAcpqG/4lWuwgsNWWOuQ\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 231,
		"path": "../public/assets/customers._code.index-DTVvALXX.js"
	},
	"/assets/customers._code.rmm-DLUtf4wg.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"8d-3GOZRdFTySW9+F8OuOD7Nr67Mss\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 141,
		"path": "../public/assets/customers._code.rmm-DLUtf4wg.js"
	},
	"/assets/customers._code.rmm.alerts-Dxux0ptj.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"17f-PdQ4BYKOm8zlTmgL6/PDjJCw0jc\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 383,
		"path": "../public/assets/customers._code.rmm.alerts-Dxux0ptj.js"
	},
	"/assets/customers._code.rmm.devices-DS29aVSG.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"18e-yAwNscbw8Qw7lcAn+qVl8kCOyhI\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 398,
		"path": "../public/assets/customers._code.rmm.devices-DS29aVSG.js"
	},
	"/assets/customers._code.rmm.index-JC4Y_sP8.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"17f-nnTOFTeac+CtsFjPWxLsRTlHRP0\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 383,
		"path": "../public/assets/customers._code.rmm.index-JC4Y_sP8.js"
	},
	"/assets/customers._code.rmm.mapping-CC5qQ12e.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"17f-fh4qrx7UgGF9OuXRwIDMDVXYQWg\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 383,
		"path": "../public/assets/customers._code.rmm.mapping-CC5qQ12e.js"
	},
	"/assets/customers._code.rmm.overview-gZTbl91R.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"14e-vC8JcOYzaWZPhIl0ai8dlKerDKw\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 334,
		"path": "../public/assets/customers._code.rmm.overview-gZTbl91R.js"
	},
	"/assets/customers._code.rmm.patch-BNMbl-wr.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"13b-BHVVmMZDJclrSkMox9SxMIkZl5U\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 315,
		"path": "../public/assets/customers._code.rmm.patch-BNMbl-wr.js"
	},
	"/assets/customers._code.rmm.workstations-BF4QED_J.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"193-EPIAIR1uV7D33bubcdcQ1dP26kg\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 403,
		"path": "../public/assets/customers._code.rmm.workstations-BF4QED_J.js"
	},
	"/assets/customers._code.syspro-DLUtf4wg.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"8d-3GOZRdFTySW9+F8OuOD7Nr67Mss\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 141,
		"path": "../public/assets/customers._code.syspro-DLUtf4wg.js"
	},
	"/assets/customers._code.syspro.dtr-DPWWFmlm.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"17f-92IAXbvbWQnnL6bdgbU6I5LZjwA\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 383,
		"path": "../public/assets/customers._code.syspro.dtr-DPWWFmlm.js"
	},
	"/assets/customers._code.syspro.health-DKAJi_XW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"17f-mFq9IQqWWLox5nyV3rTh3KjCbEc\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 383,
		"path": "../public/assets/customers._code.syspro.health-DKAJi_XW.js"
	},
	"/assets/customers._code.syspro.hotfixes-Ku99JDhR.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"17f-sFDcjP1U5DPo2Xd34cdYT0G9bwg\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 383,
		"path": "../public/assets/customers._code.syspro.hotfixes-Ku99JDhR.js"
	},
	"/assets/customers._code.syspro.index-D16GmGsY.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"17f-rE79qYhcVwrfB8lXWFzA2+YWwOA\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 383,
		"path": "../public/assets/customers._code.syspro.index-D16GmGsY.js"
	},
	"/assets/customers._code.syspro.jobs-B24ksAEV.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"17f-BaAI+lcBDZEqJeYc46qKchzw+BE\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 383,
		"path": "../public/assets/customers._code.syspro.jobs-B24ksAEV.js"
	},
	"/assets/customers._code.syspro.license-D1T-bPu5.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"17f-aojWhZDa9GIeMPvg/JVcdKnMT3Y\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 383,
		"path": "../public/assets/customers._code.syspro.license-D1T-bPu5.js"
	},
	"/assets/customers._code.syspro.operators-CS7gk-_V.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"17f-UK2k0qMhmBgduCcCc2QLqG/8DwU\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 383,
		"path": "../public/assets/customers._code.syspro.operators-CS7gk-_V.js"
	},
	"/assets/customers._code.syspro.security-a6-Hxpw3.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"17f-oyQJqkV0FEHrJbr0nspAEJZjvDo\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 383,
		"path": "../public/assets/customers._code.syspro.security-a6-Hxpw3.js"
	},
	"/assets/customers._code.syspro.sql-DNNx8Y-2.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"17f-zvLOhZ2A7wayd6IwSTRUQbGn2PE\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 383,
		"path": "../public/assets/customers._code.syspro.sql-DNNx8Y-2.js"
	},
	"/assets/dist-COB4cjCE.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"281-o3mZCUfbgHQ0NaOYoq6ZPSyReCg\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 641,
		"path": "../public/assets/dist-COB4cjCE.js"
	},
	"/assets/file-text-BFaHgaSG.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"14d-vgkNJVImUvT5y+/IP/3ONthYLos\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 333,
		"path": "../public/assets/file-text-BFaHgaSG.js"
	},
	"/assets/idle-logout-5dwmrAcR.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5b2-qLW5vWYzV2aAismAAo3cY0tbQeI\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 1458,
		"path": "../public/assets/idle-logout-5dwmrAcR.js"
	},
	"/assets/index-bTdCDKAr.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"43534-nv81f8cDXTla/IcPzSeJFYI78fQ\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 275764,
		"path": "../public/assets/index-bTdCDKAr.js"
	},
	"/assets/invariant-DEEwAagU.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3c-eVh/3DMi1s3cxf4N/OJar+ew1jA\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 60,
		"path": "../public/assets/invariant-DEEwAagU.js"
	},
	"/assets/key-round-POOegMIn.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"163-onUeeQXEBg/bsg5CJTdK/ajLBhQ\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 355,
		"path": "../public/assets/key-round-POOegMIn.js"
	},
	"/assets/layout-dashboard-DdMPJDY5.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"15f-cPvgh4NfN17DhxDqluJgrf9zVkk\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 351,
		"path": "../public/assets/layout-dashboard-DdMPJDY5.js"
	},
	"/assets/jsx-runtime-B-hcVAMW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"216d-pcqlp1Bv4Kt7yFmWJlJC8xMXx/k\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 8557,
		"path": "../public/assets/jsx-runtime-B-hcVAMW.js"
	},
	"/assets/link-CAc6-m9P.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1eb9-pkZs/dgsA/tNM1Ry3iQ657IEZ+w\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 7865,
		"path": "../public/assets/link-CAc6-m9P.js"
	},
	"/assets/login-CTZy7UtT.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2b18-46Gv3/sbjOb2SvLw5tNCxsejfjE\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 11032,
		"path": "../public/assets/login-CTZy7UtT.js"
	},
	"/assets/matchContext-B0YTMpvO.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a2-Sr4Gul00Xfso+ocUC7gKNngo61Q\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 162,
		"path": "../public/assets/matchContext-B0YTMpvO.js"
	},
	"/assets/no-cover-D3I__JaN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3d6-5zHMNIBYSoes/mcW2YNeL8cMXnQ\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 982,
		"path": "../public/assets/no-cover-D3I__JaN.js"
	},
	"/assets/plus-CaIkpfMw.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"99-EracW1kuu2iWUq5CELucqCX0ggg\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 153,
		"path": "../public/assets/plus-CaIkpfMw.js"
	},
	"/assets/rag-badge-DWFH5Vp0.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c1e-KUZ6TW21ciZ1x9or1RkblKplRUo\"",
		"mtime": "2026-08-11T12:55:57.633Z",
		"size": 3102,
		"path": "../public/assets/rag-badge-DWFH5Vp0.js"
	},
	"/assets/profile-security-panels-OJXEvf6A.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"875c-2zr7qavSsbybJ+TqFboDDJm5ml8\"",
		"mtime": "2026-08-11T12:55:57.625Z",
		"size": 34652,
		"path": "../public/assets/profile-security-panels-OJXEvf6A.js"
	},
	"/assets/refresh-cw-Cp9cxrDW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"141-gT/3BETaFa6ukQnpEtl+tz2kFWg\"",
		"mtime": "2026-08-11T12:55:57.633Z",
		"size": 321,
		"path": "../public/assets/refresh-cw-Cp9cxrDW.js"
	},
	"/assets/redirect-CaDPrkdo.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3b2-9bBwbwrhH/PEZYK8mBAWNTld9MU\"",
		"mtime": "2026-08-11T12:55:57.633Z",
		"size": 946,
		"path": "../public/assets/redirect-CaDPrkdo.js"
	},
	"/assets/reports-CCQ6AqSI.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"31f4-P76/eSxcFTBaugqbjzZ2aicTu38\"",
		"mtime": "2026-08-11T12:55:57.633Z",
		"size": 12788,
		"path": "../public/assets/reports-CCQ6AqSI.js"
	},
	"/assets/routes-OOhdSVLV.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4f9c-lNHupjk/CWfPwyARG/dbhRjB3bI\"",
		"mtime": "2026-08-11T12:55:57.633Z",
		"size": 20380,
		"path": "../public/assets/routes-OOhdSVLV.js"
	},
	"/assets/save-p5bvd5ts.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"147-7QrKhClvyEE8bW5ungZC8Hcd/S0\"",
		"mtime": "2026-08-11T12:55:57.633Z",
		"size": 327,
		"path": "../public/assets/save-p5bvd5ts.js"
	},
	"/assets/security-D1Rp-6HU.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"93-pTFrfgq1duQA946W8Z6PrRUM2Uo\"",
		"mtime": "2026-08-11T12:55:57.633Z",
		"size": 147,
		"path": "../public/assets/security-D1Rp-6HU.js"
	},
	"/assets/settings-Cp9VoN7s.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"160-ldPN6W4vxFAzfzVaN3YpjPdEoiw\"",
		"mtime": "2026-08-11T12:55:57.633Z",
		"size": 352,
		"path": "../public/assets/settings-Cp9VoN7s.js"
	},
	"/assets/settings-api-BAX6Chge.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a6b-4uSxGnAPrfygEVA/JUtO7BXQKqM\"",
		"mtime": "2026-08-11T12:55:57.633Z",
		"size": 2667,
		"path": "../public/assets/settings-api-BAX6Chge.js"
	},
	"/assets/settings.about-CnKQy3bd.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"6c9-kI03yUjuOrcni0q/lGP/7Oz5+0Y\"",
		"mtime": "2026-08-11T12:55:57.633Z",
		"size": 1737,
		"path": "../public/assets/settings.about-CnKQy3bd.js"
	},
	"/assets/settings.alerts-DKJAmJNM.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"d58-swooyQUXcYP0HnUqkhnca11iIMk\"",
		"mtime": "2026-08-11T12:55:57.633Z",
		"size": 3416,
		"path": "../public/assets/settings.alerts-DKJAmJNM.js"
	},
	"/assets/settings.audit-CLahk_Tm.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ac0-i1zpdOyjnD5KItiIllEPErEvKdY\"",
		"mtime": "2026-08-11T12:55:57.633Z",
		"size": 2752,
		"path": "../public/assets/settings.audit-CLahk_Tm.js"
	},
	"/assets/settings.collect-D44EVjnY.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"106b-rsd5psFUGRuwM5pQ0xqHe4FExqU\"",
		"mtime": "2026-08-11T12:55:57.633Z",
		"size": 4203,
		"path": "../public/assets/settings.collect-D44EVjnY.js"
	},
	"/assets/settings.dashboard-CvJ_INsX.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3559-pjJI96M2h/S5BovhK5JNNRMY3jg\"",
		"mtime": "2026-08-11T12:55:57.633Z",
		"size": 13657,
		"path": "../public/assets/settings.dashboard-CvJ_INsX.js"
	},
	"/assets/settings.integrations-yfx_T-wp.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e3d-lrsAsJUMT+wiIOngnCT3h2WL1Fk\"",
		"mtime": "2026-08-11T12:55:57.633Z",
		"size": 3645,
		"path": "../public/assets/settings.integrations-yfx_T-wp.js"
	},
	"/assets/settings.profile-C5N7MQAN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"288-yWf6U12iY24Q1AZGCQWcUhBeuYs\"",
		"mtime": "2026-08-11T12:55:57.633Z",
		"size": 648,
		"path": "../public/assets/settings.profile-C5N7MQAN.js"
	},
	"/assets/settings.rag-C2XU-YZF.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1b8d-e53BliRtIl+90/ncHFnCY50Y2Aw\"",
		"mtime": "2026-08-11T12:55:57.633Z",
		"size": 7053,
		"path": "../public/assets/settings.rag-C2XU-YZF.js"
	},
	"/assets/settings.reports-D_DkMEqY.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"6b6-F4BX43PMlwPI44N7r1bme2K50w8\"",
		"mtime": "2026-08-11T12:55:57.633Z",
		"size": 1718,
		"path": "../public/assets/settings.reports-D_DkMEqY.js"
	},
	"/assets/settings.security-BRoTQeen.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"26b-y0Vchj2cmpPhQe1YSAbhCwG17fk\"",
		"mtime": "2026-08-11T12:55:57.633Z",
		"size": 619,
		"path": "../public/assets/settings.security-BRoTQeen.js"
	},
	"/assets/settings.query-BpDBce6G.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"be9-S68xar0vWx70J9qiSmAjJq6KRHg\"",
		"mtime": "2026-08-11T12:55:57.633Z",
		"size": 3049,
		"path": "../public/assets/settings.query-BpDBce6G.js"
	},
	"/assets/settings.smtp-D6dtme4a.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"335-I07e7pkLYjaStQj1Wub5vlCjU6Q\"",
		"mtime": "2026-08-11T12:55:57.633Z",
		"size": 821,
		"path": "../public/assets/settings.smtp-D6dtme4a.js"
	},
	"/assets/settings.sql-SC__sT9b.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1e8d-gqq7m6yJ1fcPcBfEo+8Fhoa1Kfw\"",
		"mtime": "2026-08-11T12:55:57.633Z",
		"size": 7821,
		"path": "../public/assets/settings.sql-SC__sT9b.js"
	},
	"/assets/settings.ssl-yaQu66gU.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2f73-AN864bsZ89PCx3iL5zm0HBmAVQc\"",
		"mtime": "2026-08-11T12:55:57.633Z",
		"size": 12147,
		"path": "../public/assets/settings.ssl-yaQu66gU.js"
	},
	"/assets/settings.users-CqOcjZJw.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"74a-1ouSi8bkF1URK4eML4II/l1kprk\"",
		"mtime": "2026-08-11T12:55:57.633Z",
		"size": 1866,
		"path": "../public/assets/settings.users-CqOcjZJw.js"
	},
	"/assets/shield-DtCkT4wB.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"110-aoohBxl76TAPKVkRuyGEIhWQEMI\"",
		"mtime": "2026-08-11T12:55:57.633Z",
		"size": 272,
		"path": "../public/assets/shield-DtCkT4wB.js"
	},
	"/assets/shield-check-DHDQrJ-j.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"140-PDXFVaDHIOSgnwGgXQzJjc7uplU\"",
		"mtime": "2026-08-11T12:55:57.633Z",
		"size": 320,
		"path": "../public/assets/shield-check-DHDQrJ-j.js"
	},
	"/assets/styles-Bmz8td7_.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"33dad-aYSjNVKfjHexRJfp0SAG/GjBc/0\"",
		"mtime": "2026-08-11T12:55:57.633Z",
		"size": 212397,
		"path": "../public/assets/styles-Bmz8td7_.css"
	},
	"/assets/trash-2-DjLXFzbw.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"166-M4FbYnlJH02q+mETsVKWyDLB0vc\"",
		"mtime": "2026-08-11T12:55:57.633Z",
		"size": 358,
		"path": "../public/assets/trash-2-DjLXFzbw.js"
	},
	"/assets/two-factor-C7AWGriR.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"188-YHNusuulOo7s65ARsHKDrMpKq5g\"",
		"mtime": "2026-08-11T12:55:57.633Z",
		"size": 392,
		"path": "../public/assets/two-factor-C7AWGriR.js"
	},
	"/assets/types-VdtE7n9U.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"b79-I4fmjxPWNjsnnHykfJtqli68918\"",
		"mtime": "2026-08-11T12:55:57.633Z",
		"size": 2937,
		"path": "../public/assets/types-VdtE7n9U.js"
	},
	"/assets/use-current-user-DA9ApWNj.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"127-7yXE3Hu3moa6q9jxk3eyvv0+vtE\"",
		"mtime": "2026-08-11T12:55:57.633Z",
		"size": 295,
		"path": "../public/assets/use-current-user-DA9ApWNj.js"
	},
	"/assets/use-dashboard-config-BeCF-giv.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"385-LT2Ng9uSeLr2ElPweKqnVJlk8jQ\"",
		"mtime": "2026-08-11T12:55:57.633Z",
		"size": 901,
		"path": "../public/assets/use-dashboard-config-BeCF-giv.js"
	},
	"/assets/use-staff-profile-BVfwMPXq.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3c1-ErGfzgKZMKiPyer1JL/b4eZosHY\"",
		"mtime": "2026-08-11T12:55:57.633Z",
		"size": 961,
		"path": "../public/assets/use-staff-profile-BVfwMPXq.js"
	},
	"/assets/useRouter-BXRWbVwb.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2b2-kmTbqrd3v/cnErCEBIMPSeSagCY\"",
		"mtime": "2026-08-11T12:55:57.633Z",
		"size": 690,
		"path": "../public/assets/useRouter-BXRWbVwb.js"
	},
	"/assets/useStore-DYALQA98.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"486b-RS3BMoQoSwZfPcr+nedDGbUhvYw\"",
		"mtime": "2026-08-11T12:55:57.633Z",
		"size": 18539,
		"path": "../public/assets/useStore-DYALQA98.js"
	},
	"/assets/utils-CbRcvG-h.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"6cf4-rE5o+bFrZYLAec32WjAR59s1irs\"",
		"mtime": "2026-08-11T12:55:57.633Z",
		"size": 27892,
		"path": "../public/assets/utils-CbRcvG-h.js"
	},
	"/brand/login-dc.jpg": {
		"type": "image/jpeg",
		"etag": "\"183b5-fI0vJzrdmuulJaGeLllgFdvVhgM\"",
		"mtime": "2026-08-11T12:56:00.373Z",
		"size": 99253,
		"path": "../public/brand/login-dc.jpg"
	},
	"/brand/login-glass4-bg.jpg": {
		"type": "image/jpeg",
		"etag": "\"1361b-6QatlR5NMNHoP5Ygu0qeyhJTGto\"",
		"mtime": "2026-08-11T12:56:00.373Z",
		"size": 79387,
		"path": "../public/brand/login-glass4-bg.jpg"
	},
	"/brand/powershell-terminal.jpg": {
		"type": "image/jpeg",
		"etag": "\"3f833-ZoFM+LGa7fHK/Xb/INZo/TIXEbg\"",
		"mtime": "2026-08-11T12:56:00.373Z",
		"size": 260147,
		"path": "../public/brand/powershell-terminal.jpg"
	},
	"/brand/rpm-assure-logo-hero.jpg": {
		"type": "image/jpeg",
		"etag": "\"2d11a-9UEsGDWhrxSMNmIho+88iY3VvbU\"",
		"mtime": "2026-08-11T12:56:00.373Z",
		"size": 184602,
		"path": "../public/brand/rpm-assure-logo-hero.jpg"
	},
	"/brand/rpm-resources-logo.jpg": {
		"type": "image/jpeg",
		"etag": "\"54a4-+Bmj/t7ZS9O4Sw6EjRaOGRQlrJc\"",
		"mtime": "2026-08-11T12:56:00.373Z",
		"size": 21668,
		"path": "../public/brand/rpm-resources-logo.jpg"
	}
};
//#endregion
//#region #nitro/virtual/public-assets-node
function readAsset(id) {
	const serverDir = dirname(fileURLToPath(globalThis.__nitro_main__));
	return promises.readFile(resolve(serverDir, public_assets_data_default[id].path));
}
//#endregion
//#region #nitro/virtual/public-assets
var publicAssetBases = {};
function isPublicAssetURL(id = "") {
	if (public_assets_data_default[id]) return true;
	for (const base in publicAssetBases) if (id.startsWith(base)) return true;
	return false;
}
function getAsset(id) {
	return public_assets_data_default[id];
}
//#endregion
//#region node_modules/nitro/dist/runtime/internal/static.mjs
var METHODS = /* @__PURE__ */ new Set(["HEAD", "GET"]);
var EncodingMap = {
	gzip: ".gz",
	br: ".br",
	zstd: ".zst"
};
var static_default = defineHandler((event) => {
	if (event.req.method && !METHODS.has(event.req.method)) return;
	let id = decodePath(withLeadingSlash(withoutTrailingSlash(event.url.pathname)));
	let asset;
	const encodings = [...(event.req.headers.get("accept-encoding") || "").split(",").map((e) => EncodingMap[e.trim()]).filter(Boolean).sort(), ""];
	for (const encoding of encodings) for (const _id of [id + encoding, joinURL(id, "index.html" + encoding)]) {
		const _asset = getAsset(_id);
		if (_asset) {
			asset = _asset;
			id = _id;
			break;
		}
	}
	if (!asset) {
		if (isPublicAssetURL(id)) {
			event.res.headers.delete("Cache-Control");
			throw new HTTPError({ status: 404 });
		}
		return;
	}
	if (encodings.length > 1) event.res.headers.append("Vary", "Accept-Encoding");
	if (event.req.headers.get("if-none-match") === asset.etag) {
		event.res.status = 304;
		event.res.statusText = "Not Modified";
		return "";
	}
	const ifModifiedSinceH = event.req.headers.get("if-modified-since");
	const mtimeDate = new Date(asset.mtime);
	if (ifModifiedSinceH && asset.mtime && new Date(ifModifiedSinceH) >= mtimeDate) {
		event.res.status = 304;
		event.res.statusText = "Not Modified";
		return "";
	}
	if (asset.type) event.res.headers.set("Content-Type", asset.type);
	if (asset.etag && !event.res.headers.has("ETag")) event.res.headers.set("ETag", asset.etag);
	if (asset.mtime && !event.res.headers.has("Last-Modified")) event.res.headers.set("Last-Modified", mtimeDate.toUTCString());
	if (asset.encoding && !event.res.headers.has("Content-Encoding")) event.res.headers.set("Content-Encoding", asset.encoding);
	if (asset.size > 0 && !event.res.headers.has("Content-Length")) event.res.headers.set("Content-Length", asset.size.toString());
	return readAsset(id);
});
//#endregion
//#region #nitro/virtual/routing
var findRouteRules = /* @__PURE__ */ (() => {
	const $0 = [{
		name: "headers",
		route: "/assets/**",
		handler: headers,
		options: { "cache-control": "public, max-age=31536000, immutable" }
	}];
	return (m, p) => {
		let r = [];
		if (p.charCodeAt(p.length - 1) === 47) p = p.slice(0, -1) || "/";
		let s = p.split("/");
		if (s.length > 1) {
			if (s[1] === "assets") r.unshift({
				data: $0,
				params: { "_": s.slice(2).join("/") }
			});
		}
		return r;
	};
})();
var _lazy_IO091Z = defineLazyEventHandler(() => import("./_chunks/ssr-renderer.mjs"));
var findRoute = /* @__PURE__ */ (() => {
	const data = {
		route: "/**",
		handler: _lazy_IO091Z
	};
	return ((_m, p) => {
		return {
			data,
			params: { "_": p.slice(1) }
		};
	});
})();
var globalMiddleware = [toEventHandler(static_default)].filter(Boolean);
//#endregion
//#region node_modules/nitro/dist/runtime/internal/error/prod.mjs
var errorHandler = (error, event) => {
	const res = defaultHandler(error, event);
	return new NodeResponse(typeof res.body === "string" ? res.body : JSON.stringify(res.body, null, 2), res);
};
function defaultHandler(error, event) {
	const unhandled = error.unhandled ?? !HTTPError.isError(error);
	const { status = 500, statusText = "" } = unhandled ? {} : error;
	if (status === 404) {
		const url = event.url || new URL(event.req.url);
		const baseURL = "/";
		if (/^\/[^/]/.test(baseURL) && !url.pathname.startsWith(baseURL)) return {
			status: 302,
			headers: new Headers({ location: `${baseURL}${url.pathname.slice(1)}${url.search}` })
		};
	}
	const headers = new Headers(unhandled ? {} : error.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	return {
		status,
		statusText,
		headers,
		body: {
			error: true,
			...unhandled ? {
				status,
				unhandled: true
			} : typeof error.toJSON === "function" ? error.toJSON() : {
				status,
				statusText,
				message: error.message
			}
		}
	};
}
//#endregion
//#region #nitro/virtual/error-handler
var errorHandlers = [errorHandler];
async function error_handler_default(error, event) {
	for (const handler of errorHandlers) try {
		const response = await handler(error, event, { defaultHandler });
		if (response) return response;
	} catch (error) {
		console.error(error);
	}
}
//#endregion
//#region #nitro/virtual/app
function createNitroApp() {
	const captureError = (error, errorCtx) => {
		if (errorCtx?.event) {
			const errors = errorCtx.event.req.context?.nitro?.errors;
			if (errors) errors.push({
				error,
				context: errorCtx
			});
		}
	};
	const h3App = createH3App({ onError(error, event) {
		return error_handler_default(error, event);
	} });
	let appHandler = (req) => {
		req.context ||= {};
		req.context.nitro = req.context.nitro || { errors: [] };
		return h3App.fetch(req);
	};
	return {
		fetch: appHandler,
		h3: h3App,
		hooks: void 0,
		captureError
	};
}
function createH3App(config) {
	const h3App = new H3Core(config);
	h3App["~findRoute"] = (event) => findRoute(event.req.method, event.url.pathname);
	h3App["~middleware"].push(...globalMiddleware);
	h3App["~getMiddleware"] = (event, route) => {
		const pathname = event.url.pathname;
		const method = event.req.method;
		const middleware = [];
		const routeRules = getRouteRules(method, pathname);
		event.context.routeRules = routeRules?.routeRules;
		if (routeRules?.routeRuleMiddleware.length) middleware.push(...routeRules.routeRuleMiddleware);
		middleware.push(...h3App["~middleware"]);
		if (route?.data?.middleware?.length) middleware.push(...route.data.middleware);
		return middleware;
	};
	return h3App;
}
//#endregion
//#region node_modules/nitro/dist/runtime/internal/app.mjs
var APP_ID = "default";
function useNitroApp() {
	let instance = useNitroApp._instance;
	if (instance) return instance;
	instance = useNitroApp._instance = createNitroApp();
	globalThis.__nitro__ = globalThis.__nitro__ || {};
	globalThis.__nitro__[APP_ID] = instance;
	return instance;
}
function getRouteRules(method, pathname) {
	const m = findRouteRules(method, pathname);
	if (!m?.length) return { routeRuleMiddleware: [] };
	const routeRules = {};
	for (const layer of m) for (const rule of layer.data) {
		const currentRule = routeRules[rule.name];
		if (currentRule) {
			if (rule.options === false) {
				delete routeRules[rule.name];
				continue;
			}
			if (typeof currentRule.options === "object" && typeof rule.options === "object") currentRule.options = {
				...currentRule.options,
				...rule.options
			};
			else currentRule.options = rule.options;
			currentRule.route = rule.route;
			currentRule.params = {
				...currentRule.params,
				...layer.params
			};
		} else if (rule.options !== false) routeRules[rule.name] = {
			...rule,
			params: layer.params
		};
	}
	const middleware = [];
	const orderedRules = Object.values(routeRules).sort((a, b) => (a.handler?.order || 0) - (b.handler?.order || 0));
	for (const rule of orderedRules) {
		if (rule.options === false || !rule.handler) continue;
		middleware.push(rule.handler(rule));
	}
	return {
		routeRules,
		routeRuleMiddleware: middleware
	};
}
//#endregion
//#region node_modules/nitro/dist/runtime/internal/error/hooks.mjs
function _captureError(error, type) {
	console.error(`[${type}]`, error);
	useNitroApp().captureError?.(error, { tags: [type] });
}
function trapUnhandledErrors() {
	process.on("unhandledRejection", (error) => _captureError(error, "unhandledRejection"));
	process.on("uncaughtException", (error) => _captureError(error, "uncaughtException"));
}
//#endregion
//#region #nitro/virtual/tracing
var tracingSrvxPlugins = [];
//#endregion
//#region node_modules/nitro/dist/presets/node/runtime/node-server.mjs
var _parsedPort = Number.parseInt(process.env.NITRO_PORT ?? process.env.PORT ?? "");
var port = Number.isNaN(_parsedPort) ? 3e3 : _parsedPort;
var host = process.env.NITRO_HOST || process.env.HOST;
var cert = process.env.NITRO_SSL_CERT;
var key = process.env.NITRO_SSL_KEY;
var nitroApp = useNitroApp();
serve({
	port,
	hostname: host,
	tls: cert && key ? {
		cert,
		key
	} : void 0,
	fetch: nitroApp.fetch,
	plugins: [...tracingSrvxPlugins]
});
trapUnhandledErrors();
var node_server_default = {};
//#endregion
export { node_server_default as default };
