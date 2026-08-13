import { m as createFileRoute, p as lazyRouteComponent } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as fetchCustomerDetail } from "./portfolio-C-mAzdfM.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/customers._code-DMK4iK3J.js
var $$splitComponentImporter = () => import("./customers._code-CW_K5RbF.mjs");
function decodeCode(raw) {
	let s = String(raw ?? "").trim();
	try {
		s = decodeURIComponent(s);
	} catch {}
	return s.trim();
}
var Route = createFileRoute("/customers/$code")({
	staleTime: 18e4,
	preloadStaleTime: 18e4,
	shouldReload: false,
	loader: async ({ params }) => {
		const code = decodeCode(params.code);
		const detail = await fetchCustomerDetail({ data: { code } });
		if (!detail) return {
			_missing: true,
			code,
			dataMode: "demo",
			customer: {
				customerCode: code,
				displayName: code,
				active: true,
				sqlInstanceName: null,
				asOfDate: null,
				healthRag: "Amber",
				healthSummary: "Customer code not resolved in SQL or demo portfolio.",
				activeUserCount: 0,
				operatorCount: 0,
				sysproJobErrorCount: 0,
				sysproDtrVarianceLines: 0,
				lastImportAt: null,
				reportingPeriod: null
			},
			operators: [],
			recentLogins: [],
			jobErrors: [],
			dtrLevel1: [],
			dtrDetailLines: [],
			finsightReconCases: [],
			license: null,
			healthLogs: [],
			taskGroups: [],
			taskItems: [],
			incidents: [],
			problems: [],
			risks: [],
			issues: [],
			priorities: [],
			slaPolicies: [],
			availabilitySla: null,
			amsSlaSummary: null,
			changes: [],
			csat: null,
			operGroups: [],
			operAmends: [],
			securitySummary: {
				groupMemberships: 0,
				distinctOperatorsInGroups: 0,
				distinctGroups: 0,
				amendCount90d: 0
			},
			execSummary: null,
			execNarratives: [],
			auditEvents: [],
			diagSummaries: [],
			sqlHealthRows: [],
			sqlBackups: [],
			sqlBackupFailures: [],
			sysproVersion: null,
			sysproHotfixes: [],
			hotfixGap: [],
			hotfixGapSummary: null,
			operationalAssurance: {
				collectAgeHours: null,
				collectFresh: false,
				jobErrorCount: 0,
				activeUserRatioPct: null,
				dtrOutOfBalance: 0,
				scorePct: 0,
				summary: "Customer not resolved."
			},
			extraSummary: {
				auditCount: 0,
				diagCount: 0,
				sqlHealthCount: 0,
				sqlHealthFailCount: 0,
				lastAuditImport: null
			},
			cover: {
				syspro: false,
				rmm: false,
				cove: false,
				epp: false,
				csp: false
			},
			rmm: {
				enabled: false,
				pillarOn: false,
				pulsewayOrgName: null,
				summary: null,
				devices: [],
				alerts: [],
				mapping: [],
				message: "Could not load this customer from central SQL. Check Dim_Customer.CustomerCode matches the URL (e.g. AHIC not display name), then refresh."
			},
			cove: {
				enabled: false,
				summary: null,
				devices: [],
				mapping: [],
				unmapped: [],
				message: null
			},
			epp: {
				enabled: false,
				summary: null,
				devices: [],
				message: null,
				license: null
			}
		};
		return detail;
	},
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };
