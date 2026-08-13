//#region node_modules/.nitro/vite/services/ssr/assets/cover-XYn6CGMi.js
var NO_COVER = "No Cover";
function hasText(v) {
	return Boolean(v != null && String(v).trim());
}
/**
* SYSPRO-only resolve (supports deferred hard-off via PillarSyspro=false).
* - explicit flag false → hard No Cover
* - evidence → Covered
* - explicit flag true → Covered
* - else → No Cover
*/
function resolveSyspro(evidence, flag) {
	if (flag === false) return false;
	if (evidence) return true;
	if (flag === true) return true;
	return false;
}
/**
* Data-first resolve for RMM / Cove / EPP / CSP.
* Mapped warehouse data always means Covered (ignores default Pillar*=0).
* Flag true can pre-enable before first collect.
*/
function resolveDataFirst(evidence, flag) {
	if (evidence) return true;
	if (flag === true) return true;
	return false;
}
/**
* Infer which services are in scope from **relevant data** (same rules for all customers).
*
* SYSPRO evidence: SQL instance mapping, operators, active users, or last SYSPRO import.
* RMM evidence: Pulseway org name, mapped devices, or device count.
* Cove evidence: partner/mapping or device count.
* EPP / CSP: device/user counts when provided.
*/
function inferCustomerCover(input) {
	const sysproEvidence = hasText(input.sqlInstanceName) || (Number(input.operatorCount) || 0) > 0 || (Number(input.activeUserCount) || 0) > 0 || hasText(input.sysproLastImportAt) || (Number(input.sysproJobErrorCount) || 0) > 0 || (Number(input.sysproDtrVarianceLines) || 0) > 0 || Boolean(input.sysproHasLicense) || Boolean(input.sysproHasVersion) || (Number(input.sysproHotfixCount) || 0) > 0;
	const rmmEvidence = hasText(input.pulsewayOrgName) || Boolean(input.pulsewayMapped) || (Number(input.pulsewayDeviceCount) || 0) > 0;
	const coveEvidence = Boolean(input.coveMapped) || hasText(input.covePartnerName) || (Number(input.coveDeviceCount) || 0) > 0;
	const eppEvidence = (Number(input.eppDeviceCount) || 0) > 0;
	const cspEvidence = (Number(input.cspUserCount) || 0) > 0 || (Number(input.cspLicenseCount) || 0) > 0;
	return {
		syspro: resolveSyspro(sysproEvidence, input.pillarSyspro),
		rmm: resolveDataFirst(rmmEvidence, input.pillarPulseway),
		cove: resolveDataFirst(coveEvidence, input.pillarCove),
		epp: resolveDataFirst(eppEvidence, input.pillarEpp),
		csp: resolveDataFirst(cspEvidence, input.pillarCsp)
	};
}
function anyCover(c) {
	return c.syspro || c.rmm || c.cove || Boolean(c.epp) || Boolean(c.csp);
}
/** After warehouse load: any real SYSPRO footprint forces Covered (all customers). */
function forceSysproCoverIfEvidence(cover, evidence) {
	if (evidence && !cover.syspro) return {
		...cover,
		syspro: true
	};
	return cover;
}
function averageCoveredScores(cover, scores) {
	const parts = [];
	if (cover.syspro && scores.syspro != null && Number.isFinite(scores.syspro)) parts.push(Number(scores.syspro));
	if (cover.rmm && scores.rmm != null && Number.isFinite(scores.rmm)) parts.push(Number(scores.rmm));
	if (cover.cove && scores.cove != null && Number.isFinite(scores.cove)) parts.push(Number(scores.cove));
	if (parts.length === 0) return null;
	return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length * 10) / 10;
}
//#endregion
export { inferCustomerCover as a, forceSysproCoverIfEvidence as i, anyCover as n, averageCoveredScores as r, NO_COVER as t };
