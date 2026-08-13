import { n as clsx } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/utils-BpkUUAOs.js
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
/** Display times as en-ZA style; DB timestamps treated as UTC */
function formatSastTime(isoOrDate) {
	if (!isoOrDate) return "—";
	const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
	if (Number.isNaN(d.getTime())) return "—";
	return new Intl.DateTimeFormat("en-ZA", {
		timeZone: "Africa/Johannesburg",
		hour: "2-digit",
		minute: "2-digit",
		hour12: true
	}).format(d).replace(/\u202f/g, " ");
}
function formatSastDate(isoOrDate) {
	if (!isoOrDate) return "—";
	const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
	if (Number.isNaN(d.getTime())) return "—";
	return new Intl.DateTimeFormat("en-ZA", {
		timeZone: "Africa/Johannesburg",
		day: "2-digit",
		month: "2-digit",
		year: "numeric"
	}).format(d);
}
function formatSastDateTime(isoOrDate) {
	if (!isoOrDate) return "—";
	const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
	if (Number.isNaN(d.getTime())) return "—";
	return `${formatSastDate(d)} ${formatSastTime(d)}`;
}
//#endregion
export { formatSastDate as n, formatSastDateTime as r, cn as t };
