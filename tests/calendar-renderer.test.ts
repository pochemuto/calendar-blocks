/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from "vitest";

import { renderCalendarSelection } from "../src/calendar-renderer";

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

	it("renders one SVG with a filled interval for a same-month range", () => {
		const container = document.createElement("div");
		renderCalendarSelection(
			container,
			{
				kind: "range",
				start: { year: 2025, month: 7, day: 27 },
				end: { year: 2025, month: 7, day: 29 },
			},
			"en-US",
		);

		expect(container.querySelectorAll("svg")).toHaveLength(1);
		expect(
			container.querySelector(
				'.calendar-blocks-range-fill[data-date="2025.07.28"]',
			),
		).not.toBeNull();
		expect(
			container.querySelectorAll(".calendar-blocks-selection-outline"),
		).toHaveLength(2);
	});

	it("renders boundary months and an ellipsis for a long range", () => {
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

		expect(container.querySelectorAll("svg")).toHaveLength(2);
		expect(
			container.querySelector(".calendar-blocks-separator")?.textContent,
		).toBe("…");
		expect(
			container.querySelector(
				'.calendar-blocks-selection-outline[data-date="2025.07.27"]',
			),
		).not.toBeNull();
		expect(
			container.querySelector(
				'.calendar-blocks-selection-outline[data-date="2025.10.02"]',
			),
		).not.toBeNull();
	});
});
