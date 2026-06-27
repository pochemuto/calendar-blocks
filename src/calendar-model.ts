import {
	type CalendarDate,
	type DateSelection,
	compareCalendarDates,
	daysInMonth,
} from "./date-parser";

export type DayHighlight =
	| "none"
	| "single"
	| "range-start"
	| "range-middle"
	| "range-end"
	| "range-boundary";

export interface CalendarDayModel {
	date: CalendarDate;
	week: number;
	weekday: number;
	isWeekend: boolean;
	highlight: DayHighlight;
}

export interface CalendarMonthModel {
	year: number;
	month: number;
	weekCount: number;
	days: CalendarDayModel[];
}

export interface CalendarDisplayModel {
	months: CalendarMonthModel[];
	hasOmittedMonths: boolean;
}

export function createCalendarDisplay(
	selection: DateSelection,
): CalendarDisplayModel {
	const monthKeys =
		selection.kind === "single"
			? [toMonthKey(selection.date)]
			: getRangeMonthKeys(selection.start, selection.end);

	const hasOmittedMonths =
		selection.kind === "range" &&
		monthDistance(selection.start, selection.end) > 1;

	return {
		months: monthKeys.map(({ year, month }) =>
			createCalendarMonth(year, month, selection),
		),
		hasOmittedMonths,
	};
}

export function createCalendarMonth(
	year: number,
	month: number,
	selection: DateSelection,
): CalendarMonthModel {
	const firstWeekday = getMondayFirstWeekday(year, month);
	const dayCount = daysInMonth(year, month);
	const weekCount = Math.ceil((firstWeekday + dayCount) / 7);
	const days: CalendarDayModel[] = [];

	for (let day = 1; day <= dayCount; day += 1) {
		const position = firstWeekday + day - 1;
		const weekday = position % 7;
		const date = { year, month, day };

		days.push({
			date,
			week: Math.floor(position / 7),
			weekday,
			isWeekend: weekday >= 5,
			highlight: getHighlight(date, selection),
		});
	}

	return { year, month, weekCount, days };
}

function getRangeMonthKeys(
	start: CalendarDate,
	end: CalendarDate,
): Array<Pick<CalendarDate, "year" | "month">> {
	const first = toMonthKey(start);

	if (start.year === end.year && start.month === end.month) {
		return [first];
	}

	return [first, toMonthKey(end)];
}

function getHighlight(
	date: CalendarDate,
	selection: DateSelection,
): DayHighlight {
	if (selection.kind === "single") {
		return compareCalendarDates(date, selection.date) === 0 ? "single" : "none";
	}

	const fromStart = compareCalendarDates(date, selection.start);
	const toEnd = compareCalendarDates(date, selection.end);

	if (fromStart < 0 || toEnd > 0) {
		return "none";
	}

	if (fromStart === 0 && toEnd === 0) {
		return "range-boundary";
	}

	if (fromStart === 0) {
		return "range-start";
	}

	if (toEnd === 0) {
		return "range-end";
	}

	return "range-middle";
}

function getMondayFirstWeekday(year: number, month: number): number {
	const firstDay = new Date(0);
	firstDay.setUTCHours(0, 0, 0, 0);
	firstDay.setUTCFullYear(year, month - 1, 1);

	return (firstDay.getUTCDay() + 6) % 7;
}

function monthDistance(start: CalendarDate, end: CalendarDate): number {
	return (end.year - start.year) * 12 + end.month - start.month;
}

function toMonthKey(
	date: CalendarDate,
): Pick<CalendarDate, "year" | "month"> {
	return { year: date.year, month: date.month };
}
