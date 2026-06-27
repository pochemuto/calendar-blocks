import { describe, expect, it } from "vitest";

import {
	createCalendarDisplay,
	createCalendarMonth,
} from "../src/calendar-model";
import type { DateSelection } from "../src/date-parser";

describe("createCalendarMonth", () => {
	it.each([
		[2021, 2, 4],
		[2025, 7, 5],
		[2020, 8, 6],
	])("builds %i.%i with %i week rows", (year, month, weekCount) => {
		const model = createCalendarMonth(year, month, {
			kind: "single",
			date: { year, month, day: 1 },
		});

		expect(model.weekCount).toBe(weekCount);
	});

	it("uses Monday as the first weekday", () => {
		const model = createCalendarMonth(2025, 7, {
			kind: "single",
			date: { year: 2025, month: 7, day: 27 },
		});

		expect(model.days[0]).toMatchObject({
			date: { day: 1 },
			week: 0,
			weekday: 1,
		});
		expect(model.days.find(({ date }) => date.day === 27)).toMatchObject({
			weekday: 6,
			isWeekend: true,
			highlight: "single",
		});
	});

	it("marks both Saturday and Sunday as weekends", () => {
		const model = createCalendarMonth(2025, 7, {
			kind: "single",
			date: { year: 2025, month: 7, day: 1 },
		});

		expect(model.days.find(({ date }) => date.day === 25)?.isWeekend).toBe(
			false,
		);
		expect(model.days.find(({ date }) => date.day === 26)?.isWeekend).toBe(
			true,
		);
		expect(model.days.find(({ date }) => date.day === 27)?.isWeekend).toBe(
			true,
		);
	});

	it("marks range boundaries and intermediate days", () => {
		const selection: DateSelection = {
			kind: "range",
			start: { year: 2025, month: 7, day: 27 },
			end: { year: 2025, month: 7, day: 29 },
		};
		const model = createCalendarMonth(2025, 7, selection);

		expect(model.days.find(({ date }) => date.day === 27)?.highlight).toBe(
			"range-start",
		);
		expect(model.days.find(({ date }) => date.day === 28)?.highlight).toBe(
			"range-middle",
		);
		expect(model.days.find(({ date }) => date.day === 29)?.highlight).toBe(
			"range-end",
		);
	});

	it("marks a one-day range as one boundary", () => {
		const model = createCalendarMonth(2025, 7, {
			kind: "range",
			start: { year: 2025, month: 7, day: 27 },
			end: { year: 2025, month: 7, day: 27 },
		});

		expect(model.days.find(({ date }) => date.day === 27)?.highlight).toBe(
			"range-boundary",
		);
	});
});

describe("createCalendarDisplay", () => {
	it("shows one month for a range within that month", () => {
		const display = createCalendarDisplay({
			kind: "range",
			start: { year: 2025, month: 7, day: 27 },
			end: { year: 2025, month: 7, day: 29 },
		});

		expect(display.months).toHaveLength(1);
		expect(display.hasOmittedMonths).toBe(false);
	});

	it("shows adjacent months without an omission marker", () => {
		const display = createCalendarDisplay({
			kind: "range",
			start: { year: 2025, month: 12, day: 30 },
			end: { year: 2026, month: 1, day: 2 },
		});

		expect(display.months.map(({ year, month }) => [year, month])).toEqual([
			[2025, 12],
			[2026, 1],
		]);
		expect(display.hasOmittedMonths).toBe(false);
	});

	it("shows only boundary months when intermediate months are omitted", () => {
		const display = createCalendarDisplay({
			kind: "range",
			start: { year: 2025, month: 7, day: 27 },
			end: { year: 2025, month: 10, day: 2 },
		});

		expect(display.months.map(({ month }) => month)).toEqual([7, 10]);
		expect(display.hasOmittedMonths).toBe(true);
		expect(
			display.months[0]?.days.find(({ date }) => date.day === 28)?.highlight,
		).toBe("range-middle");
		expect(
			display.months[1]?.days.find(({ date }) => date.day === 1)?.highlight,
		).toBe("range-middle");
	});
});
