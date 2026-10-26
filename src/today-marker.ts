import { type CalendarDate, formatCalendarDate } from "./date-parser";

export const TODAY_MARKER_COUNT = 4;

/** Pick a stable pseudorandom variant from the local day and source identity. */
export function getTodayMarkerIndex(
	today: CalendarDate,
	fileName: string,
	calendarIndex: number,
	seedOverride?: number,
): number {
	const key = JSON.stringify([formatCalendarDate(today), fileName, calendarIndex]);
	let seed = 2166136261;
	for (let index = 0; index < key.length; index++) {
		seed = Math.imul(seed ^ key.charCodeAt(index), 16777619);
	}
	seed = ((seedOverride ?? seed) + 0x6d2b79f5) | 0;
	let value = Math.imul(seed ^ (seed >>> 15), seed | 1);
	value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
	const random = ((value ^ (value >>> 14)) >>> 0) / 4294967296;
	return Math.floor(random * TODAY_MARKER_COUNT);
}
