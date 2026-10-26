/**
 * @vitest-environment jsdom
 */

import "./obsidian-dom";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
	renderCalendarSelection,
	rerenderCalendarRoot,
	STRETCHED_CALENDAR_CLASS,
} from "../src/calendar-renderer";

import { parseDateInput } from "../src/date-parser";
import { SELECTION_COLORS } from "../src/selection-palette";
import { getTodayMarkerIndex } from "../src/today-marker";
import marker1 from "../src/assets/today-marker.svg";
import marker2 from "../src/assets/today-marker-2.svg";
import marker3 from "../src/assets/today-marker-3.svg";
import marker4 from "../src/assets/today-marker-4.svg";

describe("renderCalendarSelection", () => {
	it.each([true, false])("keeps local overrides across global settings changes: %s", (enabled) => {
		const container = document.createElement("div");
		const parsed = parseDateInput(`${enabled ? "today stretch" : "no-today no-stretch"}\n2026.10.26`);
		if (!parsed.ok) throw new Error(parsed.message);
		renderCalendarSelection(container, parsed.value, "en", {
			showToday: !enabled, stretchCalendar: !enabled, localOverrides: parsed.overrides,
		});
		const check = () => {
			expect(container.querySelector(".calendar-blocks-today-marker") !== null).toBe(enabled);
			expect(container.firstElementChild?.classList.contains(STRETCHED_CALENDAR_CLASS)).toBe(enabled);
		};
		check();
		for (const globalValue of [false, true, false]) {
			rerenderCalendarRoot(container.firstElementChild as HTMLElement, {
				showToday: globalValue, stretchCalendar: globalValue,
			});
			check();
		}
	});
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 9, 26, 12));
	});
	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it.each([[7, marker1], [0, marker2], [1, marker3], [4, marker4]] as const)("reproduces marker variant with fixed seed %i", (seed, marker) => {
		const selection = parseDateInput("2026.10.26");
		if (!selection.ok) throw new Error(selection.message);
		for (let repeat = 0; repeat < 2; repeat++) {
			const container = document.createElement("div");
			renderCalendarSelection(container, selection.value, "en-US", { markerSeed: seed });
			expect(container.querySelector(".calendar-blocks-today-marker")?.getAttribute("href"))
				.toBe(marker);
		}
	});

	it("keeps the marker fixed for a local day, filename and source ordinal across rerenders", () => {
		const random = vi.spyOn(Math, "random");
		const container = document.createElement("div");
		const selection = parseDateInput("2026.10.26");
		if (!selection.ok) throw new Error(selection.message);
		const identity = { fileName: "Vacation.md", calendarIndex: 3 };
		renderCalendarSelection(container, selection.value, "en-US", identity);
		const href = () => container.querySelector(".calendar-blocks-today-marker")?.getAttribute("href");
		const expected = [marker1, marker2, marker3, marker4][
			getTodayMarkerIndex({ year: 2026, month: 10, day: 26 }, identity.fileName, identity.calendarIndex)
		];
		expect(href()).toBe(expected);
		const rerender = (options = {}) => rerenderCalendarRoot(
			container.querySelector<HTMLElement>(".calendar-blocks-root")!, options,
		);
		rerender({ stretchCalendar: true });
		expect(href()).toBe(expected);
		rerender({ showToday: false });
		expect(href()).toBeUndefined();
		rerender({ showToday: true });
		expect(href()).toBe(expected);
		renderCalendarSelection(container, selection.value, "ru", identity);
		expect(href()).toBe(expected);
		expect(random).not.toHaveBeenCalled();
		vi.setSystemTime(new Date(2026, 9, 27, 0, 1));
		rerender();
		expect(container.querySelector(".calendar-blocks-today-marker")?.getAttribute("data-date"))
			.toBe("2026.10.27");
		expect(href()).toBe([marker1, marker2, marker3, marker4][
			getTodayMarkerIndex({ year: 2026, month: 10, day: 27 }, identity.fileName, identity.calendarIndex)
		]);
	});

	it.each(["2026.10.01", "2026.10.24 - 2026.10.29", "2026.10.26"])(
		"marks today above selections using the standalone SVG: %s", (source) => {
			const container = document.createElement("div");
			const selection = parseDateInput(source);
			if (!selection.ok) throw new Error(selection.message);
			renderCalendarSelection(container, selection.value, "en-US");
			const marker = container.querySelector(".calendar-blocks-today-marker")!;
			expect(marker).not.toBeNull();
			expect(marker.getAttribute("data-date")).toBe("2026.10.26");
			expect(marker.getAttribute("href")).toMatch(/^data:image\/svg\+xml[,;]/);
			expect(marker).toBe(container.querySelector("svg")!.lastElementChild);
			expect(container.querySelector('[aria-current="date"]')?.textContent).toBe("26");
			expect(container.querySelector("svg")?.getAttribute("aria-label")).toContain("today: 2026.10.26");
			const root = container.querySelector<HTMLElement>(".calendar-blocks-root")!;
			rerenderCalendarRoot(root, { showToday: false });
			expect(container.querySelector(".calendar-blocks-today-marker")).toBeNull();
			expect(container.querySelector('[aria-current="date"]')).toBeNull();
			expect(container.querySelector("svg")?.getAttribute("aria-label")).not.toContain("today:");
		},
	);

	it("uses the local date for today, including weekends, without adding missing months", () => {
		vi.setSystemTime(new Date(2026, 9, 25, 23, 59));
		const container = document.createElement("div");
		const selection = parseDateInput("2025.10.25\n2026.10.01\n2026.12.01");
		if (!selection.ok) throw new Error(selection.message);
		renderCalendarSelection(container, selection.value, "ru");
		expect(container.querySelectorAll(".calendar-blocks-today-marker")).toHaveLength(1);
		expect(container.querySelector('[aria-current="date"]')?.classList).toContain("calendar-blocks-weekend");
		expect(container.querySelector('[aria-current="date"]')?.closest("svg")?.getAttribute("aria-label"))
			.toContain("сегодня: 2026.10.25");
		const missingMonth = parseDateInput("2026.06.01 - 2026.12.01");
		if (!missingMonth.ok) throw new Error(missingMonth.message);
		renderCalendarSelection(container, missingMonth.value, "en-US");
		expect(container.querySelectorAll(".calendar-blocks-calendar")).toHaveLength(2);
		expect(container.querySelector(".calendar-blocks-today-marker")).toBeNull();
	});

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
		).toBe("JULY");
		expect(
			svg?.querySelector(
				'.calendar-blocks-selection-circle[data-date="2025.07.27"]',
			),
		).not.toBeNull();
		expect(
			container.querySelector(".calendar-blocks-root--minimal"),
		).not.toBeNull();
		expect(svg?.querySelector(".calendar-blocks-grid-line")).toBeNull();
	});

	it("renders the minimal design without a grid and selects a date with a circle", () => {
		const container = document.createElement("div");
		renderCalendarSelection(
			container,
			{
				kind: "single",
				date: { year: 2025, month: 7, day: 27 },
			},
			"ru",
		);

		const svg = container.querySelector(
			"svg.calendar-blocks-calendar--minimal",
		);
		expect(
			container.querySelector(".calendar-blocks-root--minimal"),
		).not.toBeNull();
		expect(svg?.querySelector(".calendar-blocks-grid-line")).toBeNull();
		expect(svg?.querySelector(".calendar-blocks-selection-outline")).toBeNull();
		expect(
			svg?.querySelector(
				'.calendar-blocks-selection-circle[data-date="2025.07.27"]',
			),
		).not.toBeNull();
		const selectedDay = svg?.querySelector(
				'.calendar-blocks-minimal-selected-day[data-date="2025.07.27"]',
			);
		const selectionCircle = svg?.querySelector(
			'.calendar-blocks-selection-circle[data-date="2025.07.27"]',
		);
		expect(selectedDay?.textContent).toBe("27");
		expect(Number(selectionCircle?.getAttribute("cy"))).toBe(
			Number(selectedDay?.getAttribute("y")) - 2,
		);
		expect(
			svg?.querySelector(".calendar-blocks-minimal-month-title")
				?.textContent,
		).toBe("ИЮЛЬ");
		expect(
			Array.from(
				svg?.querySelectorAll(".calendar-blocks-minimal-weekday") ?? [],
				(element) => element.textContent,
			),
		).toEqual(["П", "В", "С", "Ч", "П", "С", "В"]);
		expect(svg?.getAttribute("role")).toBe("img");
		expect(svg?.getAttribute("aria-label")).toContain("июль 2025");
		expect(svg?.querySelector("title")?.textContent).toContain("июль 2025");
	});

	it("optically aligns minimal range highlights with their day labels", () => {
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

		const segment = container.querySelector<SVGPathElement>(
			'.calendar-blocks-range-segment[data-start-date="2025.07.21"]',
		);
		const firstDay = container.querySelector<SVGTextElement>(
			'.calendar-blocks-minimal-day[data-date="2025.07.21"]',
		);
		const segmentStartY = Number(
			segment?.getAttribute("d")?.match(/^M \S+ (\S+)/)?.[1],
		);

		expect(segmentStartY + 20).toBe(
			Number(firstDay?.getAttribute("y")) - 2,
		);
	});

	it("rerenders an existing calendar when stretching changes", () => {
		const container = document.createElement("div");
		renderCalendarSelection(
			container,
			{
				kind: "single",
				date: { year: 2025, month: 7, day: 27 },
			},
			"en-US",
		);
		const root = container.querySelector<HTMLElement>(
			".calendar-blocks-root",
		);

		expect(root).not.toBeNull();
		expect(
			root === null
				? false
				: rerenderCalendarRoot(root, { stretchCalendar: true }),
		).toBe(true);
		expect(
			container.querySelector(".calendar-blocks-root")?.classList,
		).toContain(STRETCHED_CALENDAR_CLASS);
		expect(
			container.querySelector(".calendar-blocks-calendar--minimal"),
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
		).toBe("ИЮЛЬ");
		expect(
			Array.from(
				container.querySelectorAll(".calendar-blocks-weekday"),
				(element) => element.textContent,
			),
		).toEqual(["П", "В", "С", "Ч", "П", "С", "В"]);
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
		expect(segmentElements[0]?.getAttribute("d")).toContain("H 386");
		expect(segmentElements[1]?.getAttribute("d")).toMatch(/^M 34 /);
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

	it("omits adjacent-month dates and highlights from the minimal design", () => {
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
			container.querySelector(".calendar-blocks-outside-month"),
		).toBeNull();
		expect(
			container.querySelector(
				'.calendar-blocks-range-segment[data-overflow="true"]',
			),
		).toBeNull();
		expect(
			calendars[0]?.querySelector(
				'.calendar-blocks-range-segment[data-start-date="2025.07.30"]',
			),
		).not.toBeNull();
		expect(
			calendars[1]?.querySelector(
				'.calendar-blocks-range-segment[data-end-date="2025.08.03"]',
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

	it("uses one separator wave in the minimal design", () => {
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
			container
				.querySelector(".calendar-blocks-separator-wave--vertical")
				?.getAttribute("d"),
		).toBe("M 60 0 Q 0 30 60 60 T 60 120");
		expect(
			container
				.querySelector(".calendar-blocks-separator-wave--horizontal")
				?.getAttribute("d"),
		).toBe("M 0 60 Q 30 0 60 60 T 120 60");
	});
});

describe("multiple selections", () => {
	function render(source: string) {
		const parsed = parseDateInput(source);
		if (!parsed.ok) throw new Error(parsed.message);
		const container = document.createElement("div");
		renderCalendarSelection(container, parsed.value, "en-US");
		return container;
	}
	it.each([false, true])("layers each range independently below single dates (reverse: %s)", (reverse) => {
		const lines = ["2025.07.22", "2025.07.21 - 2025.07.24", "2025.07.22 - 2025.07.23", "2025.07.25"];
		const container = render((reverse ? lines.reverse() : lines).join("\n"));
		const paths = container.querySelectorAll(".calendar-blocks-range-segment");
		expect(paths).toHaveLength(2);
		expect(container.querySelector(".calendar-blocks-range-segment-background")).toBeNull();
		expect(container.querySelectorAll(".calendar-blocks-selection-circle")).toHaveLength(2);
		const circle = container.querySelector('.calendar-blocks-selection-circle[data-date="2025.07.22"]')!;
		for (const path of Array.from(paths)) expect(path.compareDocumentPosition(circle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(container.querySelectorAll('.calendar-blocks-day[data-date="2025.07.22"]')).toHaveLength(1);
		expect(container.querySelector('.calendar-blocks-minimal-selected-day[data-date="2025.07.22"]')).not.toBeNull();
		expect(container.querySelector("svg")?.getAttribute("aria-label")).toContain("July 24, 2025");
	});
	it("adds chronological months and marks only actual omissions, including between rows", () => {
		const container = render("2025.12.01\n2025.07.01 - 2025.07.03\n2025.08.01\n2025.10.01\n2026.01.01");
		expect(Array.from(container.querySelectorAll(".calendar-blocks-month-title")).map((node) => node.textContent)).toEqual(["JULY", "AUGUST", "OCTOBER", "DECEMBER", "JANUARY"]);
		expect(container.querySelectorAll(".calendar-blocks-separator")).toHaveLength(2);
		expect(container.querySelectorAll(".calendar-blocks-separator--between-rows")).toHaveLength(1);
		expect(container.querySelectorAll(".calendar-blocks-calendars--multiple > .calendar-blocks-calendars")).toHaveLength(3);
		const root = container.querySelector<HTMLElement>(".calendar-blocks-root")!;
		rerenderCalendarRoot(root, { stretchCalendar: true });
		expect(container.querySelectorAll(".calendar-blocks-calendar")).toHaveLength(5);
	});
});


describe("selection colors", () => {
	function render(source: string) {
		const parsed = parseDateInput(source);
		if (!parsed.ok) throw new Error(parsed.message);
		const container = document.createElement("div");
		renderCalendarSelection(container, parsed.value, "en-US");
		return container;
	}
	it("assigns colors to single dates and ranges from independent pools", () => {
		const container = render("2026.06.10\n\n2026.06.05 - 2026.06.11\n2026.06.10");
		const circles = container.querySelectorAll<SVGCircleElement>(".calendar-blocks-selection-circle");
		const segments = container.querySelectorAll<SVGPathElement>(".calendar-blocks-range-segment");
		expect(circles).toHaveLength(2);
		expect(circles[0].style.getPropertyValue("--calendar-blocks-selection-color")).toBe(SELECTION_COLORS[0]);
		expect(circles[1].style.getPropertyValue("--calendar-blocks-selection-color")).toBe(SELECTION_COLORS[1]);
		for (const segment of Array.from(segments)) {
			expect(segment.style.getPropertyValue("--calendar-blocks-range-color")).toBe(SELECTION_COLORS[0]);
			for (const circle of Array.from(circles)) {
				expect(segment.compareDocumentPosition(circle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
			}
		}
	});
	it("adding entries of either kind leaves the other kind's colors unchanged", () => {
		const singles = ["2026.07.10", "2026.06.10", "2026.06.11"];
		const ranges = ["2026.06.08 - 2026.06.12", "2026.06.10 - 2026.06.11", "2026.07.01 - 2026.07.03"];
		const mixed = render(singles.flatMap((single, index) => [single, ranges[index]]).join("\n"));
		function colors(container: HTMLElement, selector: string, property: string): string[] {
			return Array.from(container.querySelectorAll<SVGElement>(selector), (shape) =>
				shape.style.getPropertyValue(property),
			);
		}
		for (const [lines, selector, property] of [
			[singles, ".calendar-blocks-selection-circle", "--calendar-blocks-selection-color"],
			[ranges, ".calendar-blocks-range-segment", "--calendar-blocks-range-color"],
		] as const) {
			expect(colors(mixed, selector, property)).toEqual(colors(render(lines.join("\n")), selector, property));
		}
	});
	it("assigns collapsed ranges to the single-date pool without advancing range colors", () => {
		const container = render("2026.06.05\n2026.06.10 - 2026.06.10\n2026.06.11 - 2026.06.12\n2026.06.15\n2026.06.16 - 2026.06.17");
		expect(Array.from(container.querySelectorAll<SVGElement>(".calendar-blocks-selection-circle"),
			(circle) => circle.style.getPropertyValue("--calendar-blocks-selection-color")))
			.toEqual(SELECTION_COLORS.slice(0, 3));
		expect(Array.from(container.querySelectorAll<SVGElement>(".calendar-blocks-range-segment"),
			(segment) => segment.style.getPropertyValue("--calendar-blocks-range-color")))
			.toEqual(SELECTION_COLORS.slice(0, 2));
	});
	it("keeps range colors across weeks and months, regardless of month order", () => {
		const container = render("2026.10.01\n2026.06.25 - 2026.07.10\n2026.06.26 - 2026.06.28");
		function expectColors() {
			const calendars = container.querySelectorAll(".calendar-blocks-calendar");
			expect(calendars).toHaveLength(3);
			const june = calendars[0].querySelectorAll<SVGPathElement>(".calendar-blocks-range-segment");
			expect(june).toHaveLength(3);
			expect(Array.from(june, (path) => path.style.getPropertyValue("--calendar-blocks-range-color")))
				.toEqual([SELECTION_COLORS[0], SELECTION_COLORS[0], SELECTION_COLORS[1]]);
			const july = calendars[1].querySelectorAll<SVGPathElement>(".calendar-blocks-range-segment");
			expect(july).toHaveLength(2);
			for (const path of Array.from(july)) {
				expect(path.style.getPropertyValue("--calendar-blocks-range-color")).toBe(SELECTION_COLORS[0]);
			}
			expect(calendars[2].querySelector<SVGCircleElement>("circle")?.style.getPropertyValue("--calendar-blocks-selection-color"))
				.toBe(SELECTION_COLORS[0]);
		}
		expectColors();
		rerenderCalendarRoot(container.querySelector<HTMLElement>(".calendar-blocks-root")!, { stretchCalendar: true });
		expectColors();
	});
	it.each(["single", "range"])("renders all 40 colors for %s entries without wrapping or dropping entries", (kind) => {
		const source = Array.from({ length: 40 }, () =>
			kind === "range" ? "2026.06.10 - 2026.06.11" : "2026.06.10",
		).join("\n");
		const container = render(source);
		const shapes = container.querySelectorAll<SVGElement>(".calendar-blocks-range-segment, .calendar-blocks-selection-circle");
		expect(shapes).toHaveLength(40);
		const colors = Array.from(shapes, (shape) =>
			shape.style.getPropertyValue("--calendar-blocks-range-color") || shape.style.getPropertyValue("--calendar-blocks-selection-color"),
		);
		expect(new Set(colors).size).toBe(40);
		expect(colors).toEqual(expect.arrayContaining([...SELECTION_COLORS]));
	});
});

describe("day label readability", () => {
	it("keeps overlapping weekend dates above all highlights with normal text contrast", () => {
		const result = parseDateInput("2026.03.25 - 2026.03.29\n2026.03.28 - 2026.04.04\n2026.04.01");
		if (!result.ok) throw new Error(result.message);
		const container = document.createElement("div");
		renderCalendarSelection(container, result.value, "ru");

		for (const svg of Array.from(container.querySelectorAll("svg.calendar-blocks-calendar"))) {
			const highlights = svg.querySelectorAll(".calendar-blocks-range-segment, .calendar-blocks-selection-circle");
			for (const label of Array.from(svg.querySelectorAll(".calendar-blocks-day"))) {
				for (const highlight of Array.from(highlights)) {
					expect(highlight.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
				}
			}
		}
		for (const date of ["2026.03.28", "2026.03.29", "2026.04.04"]) {
			const label = container.querySelector(`.calendar-blocks-day[data-date="${date}"]`);
			expect(label?.classList).toContain("calendar-blocks-weekend");
			expect(label?.classList).toContain("calendar-blocks-range-day");
		}
		const unselected = container.querySelector('.calendar-blocks-day[data-date="2026.03.21"]');
		expect(unselected?.classList).toContain("calendar-blocks-weekend");
		expect(unselected?.classList).not.toContain("calendar-blocks-range-day");
		const single = container.querySelector('.calendar-blocks-day[data-date="2026.04.01"]');
		expect(single?.classList).toContain("calendar-blocks-minimal-selected-day");
		expect(single?.classList).not.toContain("calendar-blocks-range-day");
	});
});


describe("legend", () => {
	function render(source: string) {
		const parsed = parseDateInput(source, 2026);
		if (!parsed.ok) throw new Error(parsed.message);
		const container = document.createElement("div");
		renderCalendarSelection(container, parsed.value, "en-US");
		return container;
	}
	it.each(["1 Mar - 9 Mar", "1 Mar\n2 Mar - 9 Mar"])("omits the legend for unlabeled entries: %s", (source) => {
		expect(render(source).querySelector(".calendar-blocks-legend")).toBeNull();
	});
	it("places only labeled entries below every calendar, preserving source colors", () => {
		const container = render("1 Jan\nVacation: 1 Mar - 9 Mar\n2 Apr\nBirthday: 10 May");
		function checkLegend() {
			const legend = container.querySelector(".calendar-blocks-legend")!;
			expect(container.querySelectorAll(".calendar-blocks-legend")).toHaveLength(1);
			expect(legend.previousElementSibling?.classList).toContain("calendar-blocks-calendars");
			expect(Array.from(legend.querySelectorAll("li"), (item) => item.textContent)).toEqual(["Vacation", "Birthday"]);
			const markers = legend.querySelectorAll<HTMLElement>(".calendar-blocks-legend-marker");
			expect(markers[0].classList).toContain("calendar-blocks-legend-marker--range");
			expect(markers[1].classList).not.toContain("calendar-blocks-legend-marker--range");
			expect(Array.from(markers, (marker) => marker.style.getPropertyValue("--calendar-blocks-selection-color")))
				.toEqual([SELECTION_COLORS[0], SELECTION_COLORS[2]]);
			for (const marker of Array.from(markers)) {
				expect(marker.getAttribute("aria-hidden")).toBe("true");
				expect(marker.nextElementSibling?.classList).toContain("calendar-blocks-legend-label");
			}
			const range = container.querySelector<SVGPathElement>(".calendar-blocks-range-segment")!;
			expect(range.style.getPropertyValue("--calendar-blocks-range-color")).toBe(SELECTION_COLORS[0]);
			const birthday = container.querySelector<SVGCircleElement>('.calendar-blocks-selection-circle[data-date="2026.05.10"]')!;
			expect(birthday.style.getPropertyValue("--calendar-blocks-selection-color")).toBe(SELECTION_COLORS[2]);
		}
		checkLegend();
		rerenderCalendarRoot(container.querySelector<HTMLElement>(".calendar-blocks-root")!, { stretchCalendar: true });
		checkLegend();
	});
	it("renders equal range endpoints exactly like a labeled single date", () => {
		const container = render("Vacation: 1 Mar - 1 Mar");
		expect(container.querySelector(".calendar-blocks-legend-marker")?.classList)
			.not.toContain("calendar-blocks-legend-marker--range");
		expect(container.querySelectorAll(".calendar-blocks-selection-circle")).toHaveLength(1);
		expect(container.querySelectorAll(".calendar-blocks-range-segment")).toHaveLength(0);
		expect(container.isEqualNode(render("Vacation: 1 Mar"))).toBe(true);
	});
	it("renders label text literally and includes it in accessible SVG descriptions", () => {
		const label = '<img src=x onerror=alert(1)> & Vacation';
		const container = render(`${label}: 1 Mar - 9 Mar`);
		expect(container.querySelector(".calendar-blocks-legend-label")?.textContent).toBe(label);
		expect(container.querySelector("img")).toBeNull();
		const svg = container.querySelector("svg")!;
		expect(svg.getAttribute("aria-label")).toContain(label);
		expect(svg.querySelector("title")?.textContent).toContain(label);
	});
});
