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
	"YYYY.MM.DD or YYYY.MM.DD - YYYY.MM.DD";

const DATE_INPUT_PATTERN =
	/^(\d{4}\.\d{2}\.\d{2})(?:[ \t]*-[ \t]*(\d{4}\.\d{2}\.\d{2}))?$/;

export function parseDateInput(source: string): DateParseResult {
	const match = DATE_INPUT_PATTERN.exec(source.trim());

	if (match === null) {
		return failure(
			"invalid-format",
			"Input does not match a supported date format.",
		);
	}

	const startResult = parseCalendarDate(match[1]);
	if (!startResult.ok) {
		return startResult;
	}

	const endText = match[2];
	if (endText === undefined) {
		return {
			ok: true,
			value: {
				kind: "single",
				date: startResult.value,
			},
		};
	}

	const endResult = parseCalendarDate(endText);
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
		value: {
			kind: "range",
			start: startResult.value,
			end: endResult.value,
		},
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
): { ok: true; value: CalendarDate } | Exclude<DateParseResult, { ok: true }> {
	const year = Number(value.slice(0, 4));
	const month = Number(value.slice(5, 7));
	const day = Number(value.slice(8, 10));

	if (year === 0) {
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
