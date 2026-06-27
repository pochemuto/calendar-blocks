import {
	type CalendarDayModel,
	type CalendarMonthModel,
	createCalendarDisplay,
} from "./calendar-model";
import {
	type CalendarDate,
	type DateSelection,
	formatCalendarDate,
} from "./date-parser";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const SVG_WIDTH = 700;
const GRID_LEFT = 20;
const GRID_TOP = 88;
const GRID_WIDTH = SVG_WIDTH - GRID_LEFT * 2;
const WEEKDAY_HEIGHT = 48;
const DAY_HEIGHT = 72;
const BOTTOM_PADDING = 20;

export function renderCalendarSelection(
	container: HTMLElement,
	selection: DateSelection,
	locale: string,
): void {
	const safeLocale = getSupportedLocale(locale);
	const display = createCalendarDisplay(selection);
	const root = document.createElement("div");
	const calendars = document.createElement("div");

	root.className = "calendar-blocks-root";
	calendars.className = "calendar-blocks-calendars";
	calendars.classList.add(
		display.months.length === 1
			? "calendar-blocks-calendars--single"
			: "calendar-blocks-calendars--dual",
	);

	if (display.hasOmittedMonths) {
		calendars.classList.add("calendar-blocks-calendars--omitted");
	}

	display.months.forEach((month, index) => {
		if (index > 0 && display.hasOmittedMonths) {
			const separator = document.createElement("div");
			separator.className = "calendar-blocks-separator";
			separator.setAttribute("aria-hidden", "true");
			separator.textContent = "…";
			calendars.append(separator);
		}

		calendars.append(createCalendarSvg(month, selection, safeLocale));
	});

	root.append(calendars);
	container.replaceChildren(root);
}

function createCalendarSvg(
	month: CalendarMonthModel,
	selection: DateSelection,
	locale: string,
): SVGSVGElement {
	const height =
		GRID_TOP +
		WEEKDAY_HEIGHT +
		month.weekCount * DAY_HEIGHT +
		BOTTOM_PADDING;
	const monthTitle = formatMonthTitle(month.year, month.month, locale);
	const accessibleLabel = formatAccessibleLabel(
		monthTitle,
		selection,
		locale,
	);
	const cellWidth = GRID_WIDTH / 7;
	const svg = createSvgElement("svg", {
		class: "calendar-blocks-calendar",
		viewBox: `0 0 ${SVG_WIDTH} ${height}`,
		preserveAspectRatio: "xMidYMid meet",
		role: "img",
		"aria-label": accessibleLabel,
		focusable: "false",
	});

	const title = createSvgElement("title");
	title.textContent = accessibleLabel;
	svg.append(title);

	svg.append(
		createSvgElement("rect", {
			class: "calendar-blocks-background",
			x: 0,
			y: 0,
			width: SVG_WIDTH,
			height,
			rx: 20,
		}),
	);

	const heading = createSvgElement("text", {
		class: "calendar-blocks-month-title",
		x: SVG_WIDTH / 2,
		y: 50,
		"text-anchor": "middle",
	});
	heading.textContent = capitalize(monthTitle, locale);
	svg.append(heading);

	const weekdayLabels = getWeekdayLabels(locale);
	weekdayLabels.forEach((label, weekday) => {
		const text = createSvgElement("text", {
			class:
				weekday >= 5
					? "calendar-blocks-weekday calendar-blocks-weekend"
					: "calendar-blocks-weekday",
			x: GRID_LEFT + (weekday + 0.5) * cellWidth,
			y: GRID_TOP + WEEKDAY_HEIGHT / 2,
			"text-anchor": "middle",
			"dominant-baseline": "middle",
		});
		text.textContent = capitalize(label, locale);
		svg.append(text);
	});

	month.days.forEach((day) => {
		appendDayHighlight(svg, day, cellWidth);
	});

	appendGrid(svg, month.weekCount, cellWidth);

	month.days.forEach((day) => {
		const text = createSvgElement("text", {
			class: day.isWeekend
				? "calendar-blocks-day calendar-blocks-weekend"
				: "calendar-blocks-day",
			x: GRID_LEFT + (day.weekday + 0.5) * cellWidth,
			y:
				GRID_TOP +
				WEEKDAY_HEIGHT +
				(day.week + 0.5) * DAY_HEIGHT,
			"text-anchor": "middle",
			"dominant-baseline": "middle",
			"data-date": formatCalendarDate(day.date),
		});
		text.textContent = String(day.date.day);
		svg.append(text);
	});

	return svg;
}

function appendDayHighlight(
	svg: SVGSVGElement,
	day: CalendarDayModel,
	cellWidth: number,
): void {
	if (day.highlight === "none") {
		return;
	}

	const isRangeMiddle = day.highlight === "range-middle";
	const x = GRID_LEFT + day.weekday * cellWidth + 7;
	const y = GRID_TOP + WEEKDAY_HEIGHT + day.week * DAY_HEIGHT + 7;

	svg.append(
		createSvgElement("rect", {
			class: isRangeMiddle
				? "calendar-blocks-range-fill"
				: "calendar-blocks-selection-outline",
			x,
			y,
			width: cellWidth - 14,
			height: DAY_HEIGHT - 14,
			rx: 18,
			"data-date": formatCalendarDate(day.date),
			"data-highlight": day.highlight,
		}),
	);
}

function appendGrid(
	svg: SVGSVGElement,
	weekCount: number,
	cellWidth: number,
): void {
	const gridBottom = GRID_TOP + WEEKDAY_HEIGHT + weekCount * DAY_HEIGHT;

	for (let column = 0; column <= 7; column += 1) {
		svg.append(
			createSvgElement("line", {
				class: "calendar-blocks-grid-line",
				x1: GRID_LEFT + column * cellWidth,
				y1: GRID_TOP,
				x2: GRID_LEFT + column * cellWidth,
				y2: gridBottom,
			}),
		);
	}

	svg.append(
		createSvgElement("line", {
			class: "calendar-blocks-grid-line",
			x1: GRID_LEFT,
			y1: GRID_TOP,
			x2: GRID_LEFT + GRID_WIDTH,
			y2: GRID_TOP,
		}),
		createSvgElement("line", {
			class: "calendar-blocks-grid-line",
			x1: GRID_LEFT,
			y1: GRID_TOP + WEEKDAY_HEIGHT,
			x2: GRID_LEFT + GRID_WIDTH,
			y2: GRID_TOP + WEEKDAY_HEIGHT,
		}),
	);

	for (let week = 1; week <= weekCount; week += 1) {
		const y = GRID_TOP + WEEKDAY_HEIGHT + week * DAY_HEIGHT;
		svg.append(
			createSvgElement("line", {
				class: "calendar-blocks-grid-line",
				x1: GRID_LEFT,
				y1: y,
				x2: GRID_LEFT + GRID_WIDTH,
				y2: y,
			}),
		);
	}
}

function formatMonthTitle(
	year: number,
	month: number,
	locale: string,
): string {
	return new Intl.DateTimeFormat(locale, {
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	}).format(toUtcDate({ year, month, day: 1 }));
}

function formatAccessibleLabel(
	monthTitle: string,
	selection: DateSelection,
	locale: string,
): string {
	const dateFormatter = new Intl.DateTimeFormat(locale, {
		day: "numeric",
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	});

	if (selection.kind === "single") {
		return `${monthTitle}: ${dateFormatter.format(toUtcDate(selection.date))}`;
	}

	return `${monthTitle}: ${dateFormatter.format(toUtcDate(selection.start))} – ${dateFormatter.format(toUtcDate(selection.end))}`;
}

function getWeekdayLabels(locale: string): string[] {
	const formatter = new Intl.DateTimeFormat(locale, {
		weekday: "short",
		timeZone: "UTC",
	});

	return Array.from({ length: 7 }, (_, index) =>
		formatter.format(new Date(Date.UTC(2024, 0, index + 1))),
	);
}

function toUtcDate(date: CalendarDate): Date {
	const value = new Date(Date.UTC(2000, date.month - 1, date.day));
	value.setUTCFullYear(date.year);
	return value;
}

function getSupportedLocale(locale: string): string {
	const normalized = locale.replace(/_/g, "-");

	try {
		return Intl.getCanonicalLocales(normalized)[0] ?? "en";
	} catch {
		return "en";
	}
}

function capitalize(value: string, locale: string): string {
	if (value.length === 0) {
		return value;
	}

	return value.charAt(0).toLocaleUpperCase(locale) + value.slice(1);
}

function createSvgElement<K extends keyof SVGElementTagNameMap>(
	name: K,
	attributes: Record<string, number | string> = {},
): SVGElementTagNameMap[K] {
	const element = document.createElementNS(SVG_NAMESPACE, name);

	Object.entries(attributes).forEach(([attribute, value]) => {
		element.setAttribute(attribute, String(value));
	});

	return element;
}
