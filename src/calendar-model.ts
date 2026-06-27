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
	isOutsideMonth: boolean;
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

interface CalendarMonthOptions {
	includePreviousMonth?: boolean;
	includeNextMonth?: boolean;
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
		months: monthKeys.map(({ year, month }, index) =>
			createCalendarMonth(year, month, selection, {
				includePreviousMonth: index > 0,
				includeNextMonth: index < monthKeys.length - 1,
			}),
		),
		hasOmittedMonths,
	};
}

export function createCalendarMonth(
	year: number,
	month: number,
	selection: DateSelection,
	options: CalendarMonthOptions = {},
): CalendarMonthModel {
	const firstWeekday = getMondayFirstWeekday(year, month);
	const dayCount = daysInMonth(year, month);
	const weekCount = Math.ceil((firstWeekday + dayCount) / 7);
	const days: CalendarDayModel[] = [];

	if (options.includePreviousMonth === true && firstWeekday > 0) {
		const previousMonth = shiftMonth(year, month, -1);
		const previousMonthDayCount = daysInMonth(
			previousMonth.year,
			previousMonth.month,
		);

		for (let position = 0; position < firstWeekday; position += 1) {
			const day = previousMonthDayCount - firstWeekday + position + 1;
			days.push(
				createDayModel(
					{ ...previousMonth, day },
					position,
					selection,
					true,
				),
			);
		}
	}

	for (let day = 1; day <= dayCount; day += 1) {
		const position = firstWeekday + day - 1;
		const date = { year, month, day };

		days.push(createDayModel(date, position, selection, false));
	}

	if (options.includeNextMonth === true) {
		const nextMonth = shiftMonth(year, month, 1);
		const firstNextMonthPosition = firstWeekday + dayCount;
		const cellCount = weekCount * 7;

		for (
			let position = firstNextMonthPosition;
			position < cellCount;
			position += 1
		) {
			const day = position - firstNextMonthPosition + 1;
			days.push(
				createDayModel({ ...nextMonth, day }, position, selection, true),
			);
		}
	}

	return { year, month, weekCount, days };
}

function createDayModel(
	date: CalendarDate,
	position: number,
	selection: DateSelection,
	isOutsideMonth: boolean,
): CalendarDayModel {
	const weekday = position % 7;

	return {
		date,
		week: Math.floor(position / 7),
		weekday,
		isWeekend: weekday >= 5,
		isOutsideMonth,
		highlight: getHighlight(date, selection),
	};
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

function shiftMonth(
	year: number,
	month: number,
	offset: -1 | 1,
): Pick<CalendarDate, "year" | "month"> {
	const zeroBasedMonth = month - 1 + offset;
	const shiftedYear = year + Math.floor(zeroBasedMonth / 12);
	const shiftedMonth = ((zeroBasedMonth % 12) + 12) % 12;

	return { year: shiftedYear, month: shiftedMonth + 1 };
}

function toMonthKey(
	date: CalendarDate,
): Pick<CalendarDate, "year" | "month"> {
	return { year: date.year, month: date.month };
}
