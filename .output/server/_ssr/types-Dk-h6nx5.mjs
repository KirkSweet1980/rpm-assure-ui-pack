//#region node_modules/.nitro/vite/services/ssr/assets/types-Dk-h6nx5.js
var DEFAULT_SMTP = {
	enabled: false,
	host: "",
	port: 587,
	secure: false,
	user: "",
	password: "",
	fromEmail: "",
	fromName: "RPM Assure",
	replyTo: "",
	reportTo: ""
};
var DEFAULT_SSL = {
	mode: "letsencrypt",
	hostname: "assure.rpmresources.co.za",
	appHost: "127.0.0.1",
	appPort: 8081,
	letsEncryptEmail: "",
	hsts: true,
	patchAuthUrls: true,
	lastAppliedAt: null,
	certFileName: null,
	keyFileName: null
};
var DEFAULT_RAG = {
	jobErrorsRedAt: 10,
	jobErrorsAmberFrom: 1,
	dtrVarianceIsAmber: true,
	dtrVarianceRedAt: 0,
	noOperatorsIsAmber: true,
	collectStaleHours: 48
};
var DEFAULT_ALERTS = {
	enabled: false,
	emailTo: "",
	alertOnRed: true,
	jobErrorMin: 0,
	collectStaleHours: 0,
	minIntervalMinutes: 60,
	lastFiredAt: null
};
var DEFAULT_DASHBOARD = {
	estateTitle: "Exco Insight",
	estateSubtitle: "",
	showMultitenantHint: false,
	collectFreshHours: 24,
	licenseExpiringDays: 90,
	kpiCustomers: true,
	kpiAttention: true,
	kpiAssurance: true,
	kpiRefresh: true,
	kpiRisks: true,
	kpiLicenses: true,
	kpiRmm: true,
	kpiHotfixes: true,
	panelPortfolioTable: true,
	panelRmmHealth: true,
	panelDataRefresh: true,
	panelAttention: true,
	panelAssuranceChart: true,
	panelHealthChart: true,
	panelSla: true,
	panelLicenses: true,
	panelRisks: true,
	panelBackups: true,
	customerLanding: "exec",
	customerShowCharts: true,
	customerShowDtr: true,
	customerShowLists: true
};
/** Named layout presets for Settings → Dashboard */
var DASHBOARD_PRESETS = {
	full: {
		label: "Full operations",
		help: "All KPI cards and panels (default).",
		patch: { ...DEFAULT_DASHBOARD }
	},
	exco: {
		label: "ExCo board",
		help: "Assurance, attention, RMM, portfolio table — fewer technical charts.",
		patch: {
			estateTitle: "Exco Insight",
			estateSubtitle: "Board view — health, attention, and RMM posture.",
			kpiCustomers: true,
			kpiAttention: true,
			kpiAssurance: true,
			kpiRefresh: false,
			kpiRisks: true,
			kpiLicenses: true,
			kpiRmm: true,
			kpiHotfixes: false,
			panelPortfolioTable: true,
			panelRmmHealth: true,
			panelDataRefresh: false,
			panelAttention: true,
			panelAssuranceChart: true,
			panelHealthChart: false,
			panelSla: false,
			panelLicenses: true,
			panelRisks: true,
			panelBackups: false,
			showMultitenantHint: false
		}
	},
	rmm: {
		label: "RMM focus",
		help: "Pulseway health front-and-centre with portfolio and attention.",
		patch: {
			estateTitle: "Exco Insight",
			estateSubtitle: "RMM estate — devices, offline agents, critical alerts.",
			kpiCustomers: true,
			kpiAttention: true,
			kpiAssurance: true,
			kpiRefresh: true,
			kpiRisks: false,
			kpiLicenses: false,
			kpiRmm: true,
			kpiHotfixes: false,
			panelPortfolioTable: true,
			panelRmmHealth: true,
			panelDataRefresh: true,
			panelAttention: true,
			panelAssuranceChart: false,
			panelHealthChart: true,
			panelSla: false,
			panelLicenses: false,
			panelRisks: false,
			panelBackups: false
		}
	},
	syspro: {
		label: "SYSPRO AMS",
		help: "Jobs, Out of Balance, licenses, backups — hide RMM panels.",
		patch: {
			estateTitle: "Exco Insight",
			estateSubtitle: "SYSPRO AMS — operators, jobs, licenses, and backups.",
			kpiCustomers: true,
			kpiAttention: true,
			kpiAssurance: true,
			kpiRefresh: true,
			kpiRisks: true,
			kpiLicenses: true,
			kpiRmm: false,
			kpiHotfixes: true,
			panelPortfolioTable: true,
			panelRmmHealth: false,
			panelDataRefresh: true,
			panelAttention: true,
			panelAssuranceChart: true,
			panelHealthChart: true,
			panelSla: true,
			panelLicenses: true,
			panelRisks: true,
			panelBackups: true
		}
	}
};
function emptySqlConnection(partial) {
	return {
		id: partial?.id ?? "",
		name: partial?.name ?? "Primary",
		isPrimary: partial?.isPrimary ?? true,
		server: partial?.server ?? "",
		port: partial?.port ?? 14333,
		database: partial?.database ?? "RPMAssure_App",
		user: partial?.user ?? "",
		password: partial?.password ?? "",
		passwordConfigured: partial?.passwordConfigured,
		trustServerCertificate: partial?.trustServerCertificate ?? true,
		encrypt: partial?.encrypt ?? false,
		dataMode: partial?.dataMode ?? "auto"
	};
}
//#endregion
export { DEFAULT_SMTP as a, DEFAULT_RAG as i, DEFAULT_ALERTS as n, DEFAULT_SSL as o, DEFAULT_DASHBOARD as r, emptySqlConnection as s, DASHBOARD_PRESETS as t };
