/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from "vitest";

import {
	renderCalendarSelection,
	STRETCHED_CALENDAR_CLASS,
} from "../src/calendar-renderer";

describe("renderCalendarSelection", () => {
	it("renders an accessible SVG calendar for a single date", () => {
		const container = document.createElement("div");
		renderCalendarSelection(
			container,
			{
				kind: "single",
				date: { year: 2025, month: 7, day: 27 },
			},
			"en-US",
		);

		const svg = container.querySelector("svg");
		expect(svg).not.toBeNull();
		expect(svg?.getAttribute("role")).toBe("img");
		expect(svg?.getAttribute("aria-label")).toContain("July 2025");
		expect(svg?.querySelector("title")?.textContent).toContain("July 2025");
		expect(
			svg?.querySelector(".calendar-blocks-month-title")?.textContent,
		).toBe("July 2025");
		expect(
			svg?.querySelector(
				'.calendar-blocks-selection-outline[data-date="2025.07.27"]',
			),
		).not.toBeNull();
	});

	it("marks a calendar as stretched when requested", () => {
		const container = document.createElement("div");
		renderCalendarSelection(
			container,
			{
				kind: "single",
				date: { year: 2025, month: 7, day: 27 },
			},
			"en-US",
			{ stretchCalendar: true },
		);

		expect(
			container.querySelector(".calendar-blocks-root")?.classList,
		).toContain(STRETCHED_CALENDAR_CLASS);
	});

	it("marks Saturday and Sunday labels and dates as weekends", () => {
		const container = document.createElement("div");
		renderCalendarSelection(
			container,
			{
				kind: "single",
				date: { year: 2025, month: 7, day: 1 },
			},
			"en-US",
		);

		expect(
			container.querySelectorAll(
				".calendar-blocks-weekday.calendar-blocks-weekend",
			),
		).toHaveLength(2);
		expect(
			container.querySelector(
				'.calendar-blocks-day.calendar-blocks-weekend[data-date="2025.07.26"]',
			),
		).not.toBeNull();
		expect(
			container.querySelector(
				'.calendar-blocks-day.calendar-blocks-weekend[data-date="2025.07.27"]',
			),
		).not.toBeNull();
	});

	it("uses the requested locale for month and weekday labels", () => {
		const container = document.createElement("div");
		renderCalendarSelection(
			container,
			{
				kind: "single",
				date: { year: 2025, month: 7, day: 27 },
			},
			"ru",
		);

		expect(
			container.querySelector(".calendar-blocks-month-title")?.textContent,
		).toMatch(/^Июль 2025/);
		expect(
			Array.from(
				container.querySelectorAll(".calendar-blocks-weekday"),
				(element) => element.textContent,
			),
		).toEqual(["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]);
	});

	it("merges adjacent range dates within one week", () => {
		const container = document.createElement("div");
		renderCalendarSelection(
			container,
			{
				kind: "range",
				start: { year: 2025, month: 7, day: 21 },
				end: { year: 2025, month: 7, day: 23 },
			},
			"en-US",
		);

		expect(container.querySelectorAll("svg")).toHaveLength(1);
		expect(
			container.querySelector(
				'.calendar-blocks-range-segment[data-start-date="2025.07.21"][data-end-date="2025.07.23"][data-start-edge="rounded"][data-end-edge="rounded"]',
			),
		).not.toBeNull();
		expect(
			container.querySelectorAll(".calendar-blocks-range-segment"),
		).toHaveLength(1);
	});

	it("renders one merged segment per week for a multi-week range", () => {
		const container = document.createElement("div");
		renderCalendarSelection(
			container,
			{
				kind: "range",
				start: { year: 2025, month: 7, day: 25 },
				end: { year: 2025, month: 7, day: 29 },
			},
			"en-US",
		);

		const segmentElements = Array.from(
			container.querySelectorAll<SVGPathElement>(
				".calendar-blocks-range-segment",
			),
		);
		const segments = Array.from(
			segmentElements,
			(element) => [
				element.getAttribute("data-start-date"),
				element.getAttribute("data-end-date"),
				element.getAttribute("data-start-edge"),
				element.getAttribute("data-end-edge"),
			],
		);
		expect(segments).toEqual([
			["2025.07.25", "2025.07.27", "rounded", "open"],
			["2025.07.28", "2025.07.29", "open", "rounded"],
		]);
		expect(segmentElements[0]?.getAttribute("d")).toContain("H 680");
		expect(segmentElements[1]?.getAttribute("d")).toMatch(/^M 20 /);
	});

	it("leaves both edges open for a complete intermediate week", () => {
		const container = document.createElement("div");
		renderCalendarSelection(
			container,
			{
				kind: "range",
				start: { year: 2025, month: 7, day: 1 },
				end: { year: 2025, month: 7, day: 20 },
			},
			"en-US",
		);

		expect(
			container.querySelector(
				'.calendar-blocks-range-segment[data-start-date="2025.07.07"][data-end-date="2025.07.13"][data-start-edge="open"][data-end-edge="open"]',
			),
		).not.toBeNull();
	});

	it("renders dim adjacent-month dates and continues the range into them", () => {
		const container = document.createElement("div");
		renderCalendarSelection(
			container,
			{
				kind: "range",
				start: { year: 2025, month: 7, day: 30 },
				end: { year: 2025, month: 8, day: 3 },
			},
			"en-US",
		);

		const calendars = container.querySelectorAll<SVGSVGElement>(
			"svg.calendar-blocks-calendar",
		);
		expect(calendars).toHaveLength(2);
		expect(
			calendars[0]?.querySelector(
				'.calendar-blocks-outside-month[data-date="2025.08.01"]',
			),
		).not.toBeNull();
		expect(
			calendars[1]?.querySelector(
				'.calendar-blocks-outside-month[data-date="2025.07.31"]',
			),
		).not.toBeNull();
		expect(
			calendars[0]?.querySelector(
				'.calendar-blocks-range-segment:not(.calendar-blocks-range-segment--outside)[data-start-date="2025.07.30"][data-end-date="2025.07.31"][data-end-edge="open"]',
			),
		).not.toBeNull();
		expect(
			calendars[0]?.querySelector(
				'.calendar-blocks-range-segment--outside[data-start-date="2025.08.01"][data-end-date="2025.08.03"][data-start-edge="open"]',
			),
		).not.toBeNull();
		expect(
			calendars[1]?.querySelector(
				'.calendar-blocks-range-segment--outside[data-start-date="2025.07.30"][data-end-date="2025.07.31"][data-end-edge="open"]',
			),
		).not.toBeNull();
		expect(
			calendars[1]?.querySelector(
				'.calendar-blocks-range-segment:not(.calendar-blocks-range-segment--outside)[data-start-date="2025.08.01"][data-end-date="2025.08.03"][data-start-edge="open"]',
			),
		).not.toBeNull();
	});

	it("renders boundary months and a vertical wave for a long range", () => {
		const container = document.createElement("div");
		renderCalendarSelection(
			container,
			{
				kind: "range",
				start: { year: 2025, month: 7, day: 27 },
				end: { year: 2025, month: 10, day: 2 },
			},
			"en-US",
		);

		expect(
			container.querySelectorAll("svg.calendar-blocks-calendar"),
		).toHaveLength(2);
		expect(
			container.querySelector(
				"svg.calendar-blocks-separator .calendar-blocks-separator-wave--vertical",
			),
		).not.toBeNull();
		expect(
			container.querySelector(
				"svg.calendar-blocks-separator .calendar-blocks-separator-wave--horizontal",
			),
		).not.toBeNull();
		expect(
			container.querySelector(".calendar-blocks-separator")?.textContent,
		).toBe("");
		expect(
			container.querySelector(
				'.calendar-blocks-range-segment[data-start-date="2025.07.27"]',
			),
		).not.toBeNull();
		expect(
			container.querySelector(
				'.calendar-blocks-range-segment[data-end-date="2025.10.02"]',
			),
		).not.toBeNull();
	});
});
