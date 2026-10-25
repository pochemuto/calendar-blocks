export interface CalendarDate {
	year: number;
	month: number;
	day: number;
}

export type DateSelection =
	| {
			kind: "single";
			date: CalendarDate;
	  }
	| {
			kind: "range";
			start: CalendarDate;
			end: CalendarDate;
	  };

export type DateParseErrorCode =
	| "invalid-format"
	| "missing-year"
	| "invalid-year"
	| "invalid-month"
	| "invalid-day"
	| "reversed-range";

export type DateParseResult =
	| {
			ok: true;
			value: DateSelection;
	  }
	| {
			ok: false;
			code: DateParseErrorCode;
			message: string;
	  };

export const EXPECTED_DATE_FORMAT =
	"YYYY.MM.DD, YYYY-MM-DD, D.M[.YYYY], D/M[/YYYY] or D Mon [YYYY]; ranges use a hyphen";

// English aliases remain available independently of the system/app locale.
const MONTH_NAMES = [
	["jan", "january"],
	["feb", "february"],
	["mar", "march"],
	["apr", "april"],
	["may"],
	["jun", "june"],
	["jul", "july"],
	["aug", "august"],
	["sep", "sept", "september"],
	["oct", "october"],
	["nov", "november"],
	["dec", "december"],
];
interface DatePatterns {
	atStart: RegExp;
	complete: RegExp;
	named: RegExp;
	months: Map<string, number>;
}

const localePatterns = new Map<string, DatePatterns>();

function normalizeMonth(value: string): string {
	return value.normalize("NFC").replace(/\.$/, "").toLowerCase();
}

function getDatePatterns(locale?: string): DatePatterns {
	const systemLocale = new Intl.DateTimeFormat().resolvedOptions().locale;
	let appLocale = systemLocale;
	try {
		appLocale = Intl.getCanonicalLocales(locale?.replace(/_/g, "-"))[0] ?? systemLocale;
	} catch {
		// Invalid or unsupported app locales still allow system and English names.
	}
	const key = `${systemLocale}:${appLocale}`;
	const cached = localePatterns.get(key);
	if (cached) return cached;

	const months = new Map<string, number>();
	const addMonth = (name: string, month: number): void => {
		months.set(normalizeMonth(name), month);
		// Include casing variants for names such as Turkish Mayıs / MAYIS.
		months.set(normalizeMonth(name.toLocaleUpperCase(appLocale)), month);
	};
	MONTH_NAMES.forEach((names, index) => {
		names.forEach((name) => addMonth(name, index + 1));
	});
	for (const language of new Set([systemLocale, appLocale])) {
		for (const width of ["long", "short"] as const) {
			for (const withDay of [false, true]) {
				const formatter = new Intl.DateTimeFormat(language, {
					calendar: "gregory",
					numberingSystem: "latn",
					timeZone: "UTC",
					month: width,
					...(withDay ? { day: "numeric" as const } : {}),
				});
				for (let month = 1; month <= 12; month++) {
					const parts = formatter.formatToParts(new Date(Date.UTC(2000, month - 1, 1)));
					const name = parts.find((part) => part.type === "month")?.value;
					if (name) addMonth(name, month);
				}
			}
		}
	}
	const names = [...months.keys()]
		.sort((left, right) => right.length - left.length)
		.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
	// The fallback keeps unknown names a validation error, never a guessed date.
	const monthPattern = `(?:${names.join("|")}|[\\p{L}\\p{M}]+)\\.?`;
	const namedPattern = String.raw`\d{1,2}[ \t]+${monthPattern}(?:[ \t]+\d{4})?`;
	const datePattern = String.raw`(?:\d{4}([.\/-])\d{1,2}\1\d{1,2}|\d{1,2}([.\/])\d{1,2}(?:\2\d{4})?|${namedPattern})`;
	const patterns = {
		atStart: new RegExp(`^${datePattern}`, "iu"),
		complete: new RegExp(`^${datePattern}$`, "iu"),
		named: new RegExp(`^(\\d{1,2})[ \\t]+(${monthPattern})(?:[ \\t]+(\\d{4}))?$`, "iu"),
		months,
	};
	localePatterns.set(key, patterns);
	return patterns;
}

export function parseDateInput(
	source: string,
	defaultYear?: number,
	locale?: string,
): DateParseResult {
	const patterns = getDatePatterns(locale);
	const input = source.trim().normalize("NFC");
	const match = patterns.atStart.exec(input);
	if (match === null) {
		return failure(
			"invalid-format",
			"Input does not match a supported date format.",
		);
	}

	const rest = input.slice(match[0].length);
	const range = /^[ \t]*[-–—][ \t]*(.+)$/.exec(rest);
	if (rest !== "" && (range === null || !patterns.complete.test(range[1]))) {
		return failure(
			"invalid-format",
			"Input does not match a supported date format.",
		);
	}

	const startResult = parseCalendarDate(match[0], patterns, defaultYear);
	if (!startResult.ok) {
		return startResult;
	}
	if (range === null) {
		return { ok: true, value: { kind: "single", date: startResult.value } };
	}

	const endResult = parseCalendarDate(range[1], patterns, defaultYear);
	if (!endResult.ok) {
		return endResult;
	}
	if (compareCalendarDates(startResult.value, endResult.value) > 0) {
		return failure(
			"reversed-range",
			"The range start must not be later than the range end.",
		);
	}
	return {
		ok: true,
		value: { kind: "range", start: startResult.value, end: endResult.value },
	};
}

export function formatDateSelection(selection: DateSelection): string {
	if (selection.kind === "single") {
		return formatCalendarDate(selection.date);
	}

	return `${formatCalendarDate(selection.start)} - ${formatCalendarDate(selection.end)}`;
}

function parseCalendarDate(
	value: string,
	patterns: DatePatterns,
	defaultYear?: number,
): { ok: true; value: CalendarDate } | Exclude<DateParseResult, { ok: true }> {
	let year: number | undefined;
	let month: number;
	let day: number;
	const yearFirst = /^(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})$/.exec(value);
	const dayFirst = /^(\d{1,2})[.\/](\d{1,2})(?:[.\/](\d{4}))?$/.exec(value);
	const named = patterns.named.exec(value);
	if (yearFirst) {
		year = Number(yearFirst[1]);
		month = Number(yearFirst[2]);
		day = Number(yearFirst[3]);
	} else if (dayFirst) {
		year = dayFirst[3] === undefined ? defaultYear : Number(dayFirst[3]);
		month = Number(dayFirst[2]);
		day = Number(dayFirst[1]);
	} else if (named) {
		year = named[3] === undefined ? defaultYear : Number(named[3]);
		month = patterns.months.get(normalizeMonth(named[2])) ?? 0;
		day = Number(named[1]);
	} else {
		return failure(
			"invalid-format",
			"Input does not match a supported date format.",
		);
	}

	if (year === undefined) {
		return failure(
			"missing-year",
			"Specify a year: the note's creation year is unavailable.",
		);
	}
	if (!Number.isInteger(year) || year < 1 || year > 9999) {
		return failure("invalid-year", "Year must be between 0001 and 9999.");
	}

	if (month < 1 || month > 12) {
		return failure("invalid-month", "Month must be between 01 and 12.");
	}

	const maximumDay = daysInMonth(year, month);
	if (day < 1 || day > maximumDay) {
		return failure(
			"invalid-day",
			`Day must be between 01 and ${String(maximumDay).padStart(2, "0")} for this month.`,
		);
	}

	return {
		ok: true,
		value: { year, month, day },
	};
}

export function daysInMonth(year: number, month: number): number {
	if (month === 2) {
		return isLeapYear(year) ? 29 : 28;
	}

	return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;
}

function isLeapYear(year: number): boolean {
	return year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0);
}

export function compareCalendarDates(
	left: CalendarDate,
	right: CalendarDate,
): number {
	if (left.year !== right.year) {
		return left.year - right.year;
	}

	if (left.month !== right.month) {
		return left.month - right.month;
	}

	return left.day - right.day;
}

export function formatCalendarDate(date: CalendarDate): string {
	return [
		String(date.year).padStart(4, "0"),
		String(date.month).padStart(2, "0"),
		String(date.day).padStart(2, "0"),
	].join(".");
}

function failure(
	code: DateParseErrorCode,
	message: string,
): Exclude<DateParseResult, { ok: true }> {
	return { ok: false, code, message };
}
