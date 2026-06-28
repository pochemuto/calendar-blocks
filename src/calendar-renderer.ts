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
const BASIC_SVG_WIDTH = 700;
const BASIC_GRID_LEFT = 20;
const BASIC_GRID_TOP = 88;
const BASIC_GRID_WIDTH = BASIC_SVG_WIDTH - BASIC_GRID_LEFT * 2;
const BASIC_WEEKDAY_HEIGHT = 48;
const BASIC_DAY_HEIGHT = 72;
const BASIC_BOTTOM_PADDING = 20;

const MINIMAL_SVG_WIDTH = 420;
const MINIMAL_GRID_LEFT = 34;
const MINIMAL_GRID_TOP = 76;
const MINIMAL_GRID_WIDTH = MINIMAL_SVG_WIDTH - MINIMAL_GRID_LEFT * 2;
const MINIMAL_WEEKDAY_HEIGHT = 44;
const MINIMAL_DAY_HEIGHT = 54;
const MINIMAL_BOTTOM_PADDING = 28;
const MINIMAL_HIGHLIGHT_OFFSET_Y = -2;

export const STRETCHED_CALENDAR_CLASS =
	"calendar-blocks-root--stretched";
export const CALENDAR_THEMES = ["basic", "minimal"] as const;

export type CalendarTheme = (typeof CALENDAR_THEMES)[number];

export interface CalendarRenderOptions {
	stretchCalendar?: boolean;
	theme?: CalendarTheme;
}

interface CalendarRenderState {
	container: HTMLElement;
	selection: DateSelection;
	locale: string;
}

interface RangeSegmentGeometry {
	gridLeft: number;
	gridTop: number;
	weekdayHeight: number;
	dayHeight: number;
	highlightOffsetY?: number;
}

const calendarRenderStates = new WeakMap<HTMLElement, CalendarRenderState>();

export function renderCalendarSelection(
	container: HTMLElement,
	selection: DateSelection,
	locale: string,
	options: CalendarRenderOptions = {},
): void {
	const safeLocale = getSupportedLocale(locale);
	const display = createCalendarDisplay(selection);
	const root = document.createElement("div");
	const calendars = document.createElement("div");
	const theme = options.theme ?? "basic";

	root.className = "calendar-blocks-root";
	root.classList.add(`calendar-blocks-root--${theme}`);
	root.classList.toggle(
		STRETCHED_CALENDAR_CLASS,
		options.stretchCalendar === true,
	);
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
			const verticalWavePath =
				theme === "minimal"
					? "M 60 0 Q 0 30 60 60 T 60 120"
					: "M 60 0 Q 0 7.5 60 15 T 60 30 T 60 45 T 60 60 T 60 75 T 60 90 T 60 105 T 60 120";
			const horizontalWavePath =
				theme === "minimal"
					? "M 0 60 Q 30 0 60 60 T 120 60"
					: "M 0 60 Q 7.5 0 15 60 T 30 60 T 45 60 T 60 60 T 75 60 T 90 60 T 105 60 T 120 60";
			const separator = createSvgElement("svg", {
				class: "calendar-blocks-separator",
				viewBox: "0 0 120 120",
				preserveAspectRatio: "none",
				"aria-hidden": "true",
				focusable: "false",
			});
			separator.append(
				createSvgElement("path", {
					class:
						"calendar-blocks-separator-wave calendar-blocks-separator-wave--vertical",
					d: verticalWavePath,
				}),
				createSvgElement("path", {
					class:
						"calendar-blocks-separator-wave calendar-blocks-separator-wave--horizontal",
					d: horizontalWavePath,
				}),
			);
			calendars.append(separator);
		}

		calendars.append(
			theme === "minimal"
				? createMinimalCalendarSvg(month, selection, safeLocale)
				: createBasicCalendarSvg(month, selection, safeLocale),
		);
	});

	root.append(calendars);
	container.replaceChildren(root);
	calendarRenderStates.set(root, {
		container,
		selection,
		locale: safeLocale,
	});
}

export function rerenderCalendarRoot(
	root: HTMLElement,
	options: CalendarRenderOptions,
): boolean {
	const state = calendarRenderStates.get(root);

	if (state === undefined) {
		return false;
	}

	renderCalendarSelection(
		state.container,
		state.selection,
		state.locale,
		options,
	);
	return true;
}

function createBasicCalendarSvg(
	month: CalendarMonthModel,
	selection: DateSelection,
	locale: string,
): SVGSVGElement {
	const height =
		BASIC_GRID_TOP +
		BASIC_WEEKDAY_HEIGHT +
		month.weekCount * BASIC_DAY_HEIGHT +
		BASIC_BOTTOM_PADDING;
	const monthTitle = formatMonthTitle(month.year, month.month, locale);
	const accessibleLabel = formatAccessibleLabel(
		monthTitle,
		selection,
		locale,
	);
	const cellWidth = BASIC_GRID_WIDTH / 7;
	const svg = createSvgElement("svg", {
		class: "calendar-blocks-calendar calendar-blocks-calendar--basic",
		viewBox: `0 0 ${BASIC_SVG_WIDTH} ${height}`,
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
			width: BASIC_SVG_WIDTH,
			height,
			rx: 20,
		}),
	);

	const heading = createSvgElement("text", {
		class: "calendar-blocks-month-title",
		x: BASIC_SVG_WIDTH / 2,
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
			x: BASIC_GRID_LEFT + (weekday + 0.5) * cellWidth,
			y: BASIC_GRID_TOP + BASIC_WEEKDAY_HEIGHT / 2,
			"text-anchor": "middle",
			"dominant-baseline": "middle",
		});
		text.textContent = capitalize(label, locale);
		svg.append(text);
	});

	appendBasicGrid(svg, month.weekCount, cellWidth);
	appendBasicHighlights(svg, month.days, cellWidth);

	month.days.forEach((day) => {
		const classes = ["calendar-blocks-day"];

		if (day.isWeekend) {
			classes.push("calendar-blocks-weekend");
		}

		if (day.isOutsideMonth) {
			classes.push("calendar-blocks-outside-month");
		}

		const text = createSvgElement("text", {
			class: classes.join(" "),
			x: BASIC_GRID_LEFT + (day.weekday + 0.5) * cellWidth,
			y:
				BASIC_GRID_TOP +
				BASIC_WEEKDAY_HEIGHT +
				(day.week + 0.5) * BASIC_DAY_HEIGHT,
			"text-anchor": "middle",
			"dominant-baseline": "middle",
			"data-date": formatCalendarDate(day.date),
		});
		text.textContent = String(day.date.day);
		svg.append(text);
	});

	return svg;
}

function createMinimalCalendarSvg(
	month: CalendarMonthModel,
	selection: DateSelection,
	locale: string,
): SVGSVGElement {
	const height =
		MINIMAL_GRID_TOP +
		MINIMAL_WEEKDAY_HEIGHT +
		month.weekCount * MINIMAL_DAY_HEIGHT +
		MINIMAL_BOTTOM_PADDING;
	const monthTitle = formatMonthTitle(month.year, month.month, locale);
	const accessibleLabel = formatAccessibleLabel(
		monthTitle,
		selection,
		locale,
	);
	const visibleDays = month.days.filter((day) => !day.isOutsideMonth);
	const cellWidth = MINIMAL_GRID_WIDTH / 7;
	const svg = createSvgElement("svg", {
		class: "calendar-blocks-calendar calendar-blocks-calendar--minimal",
		viewBox: `0 0 ${MINIMAL_SVG_WIDTH} ${height}`,
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
			class:
				"calendar-blocks-background calendar-blocks-minimal-background",
			x: 0,
			y: 0,
			width: MINIMAL_SVG_WIDTH,
			height,
			rx: 48,
		}),
	);

	const heading = createSvgElement("text", {
		class:
			"calendar-blocks-month-title calendar-blocks-minimal-month-title",
		x: MINIMAL_GRID_LEFT,
		y: 50,
		"text-anchor": "start",
	});
	heading.textContent = formatMinimalMonthTitle(
		month.year,
		month.month,
		locale,
	);
	svg.append(heading);

	const weekdayLabels = getWeekdayLabels(locale, "narrow");
	weekdayLabels.forEach((label, weekday) => {
		const classes = [
			"calendar-blocks-weekday",
			"calendar-blocks-minimal-weekday",
		];

		if (weekday >= 5) {
			classes.push("calendar-blocks-weekend");
		}

		const text = createSvgElement("text", {
			class: classes.join(" "),
			x: MINIMAL_GRID_LEFT + (weekday + 0.5) * cellWidth,
			y: MINIMAL_GRID_TOP + MINIMAL_WEEKDAY_HEIGHT / 2,
			"text-anchor": "middle",
			"dominant-baseline": "middle",
		});
		text.textContent = capitalize(label, locale);
		svg.append(text);
	});

	appendMinimalHighlights(svg, visibleDays, cellWidth);

	visibleDays.forEach((day) => {
		const classes = [
			"calendar-blocks-day",
			"calendar-blocks-minimal-day",
		];

		if (day.isWeekend) {
			classes.push("calendar-blocks-weekend");
		}

		if (day.highlight === "single") {
			classes.push("calendar-blocks-minimal-selected-day");
		}

		const text = createSvgElement("text", {
			class: classes.join(" "),
			x: MINIMAL_GRID_LEFT + (day.weekday + 0.5) * cellWidth,
			y:
				MINIMAL_GRID_TOP +
				MINIMAL_WEEKDAY_HEIGHT +
				(day.week + 0.5) * MINIMAL_DAY_HEIGHT,
			"text-anchor": "middle",
			"dominant-baseline": "middle",
			"data-date": formatCalendarDate(day.date),
		});
		text.textContent = String(day.date.day);
		svg.append(text);
	});

	return svg;
}

function appendBasicHighlights(
	svg: SVGSVGElement,
	days: CalendarDayModel[],
	cellWidth: number,
): void {
	const singleDay = days.find(({ highlight }) => highlight === "single");

	if (singleDay !== undefined) {
		appendBasicSingleHighlight(svg, singleDay, cellWidth);
		return;
	}

	appendRangeHighlights(svg, days, cellWidth, {
		gridLeft: BASIC_GRID_LEFT,
		gridTop: BASIC_GRID_TOP,
		weekdayHeight: BASIC_WEEKDAY_HEIGHT,
		dayHeight: BASIC_DAY_HEIGHT,
	});
}

function appendMinimalHighlights(
	svg: SVGSVGElement,
	days: CalendarDayModel[],
	cellWidth: number,
): void {
	const singleDay = days.find(({ highlight }) => highlight === "single");

	if (singleDay !== undefined) {
		const centerX =
			MINIMAL_GRID_LEFT + (singleDay.weekday + 0.5) * cellWidth;
		const centerY =
			MINIMAL_GRID_TOP +
			MINIMAL_WEEKDAY_HEIGHT +
			(singleDay.week + 0.5) * MINIMAL_DAY_HEIGHT +
			MINIMAL_HIGHLIGHT_OFFSET_Y;

		svg.append(
			createSvgElement("circle", {
				class: "calendar-blocks-selection-circle",
				cx: centerX,
				cy: centerY,
				r: 21,
				"data-date": formatCalendarDate(singleDay.date),
				"data-highlight": singleDay.highlight,
			}),
		);
		return;
	}

	appendRangeHighlights(svg, days, cellWidth, {
		gridLeft: MINIMAL_GRID_LEFT,
		gridTop: MINIMAL_GRID_TOP,
		weekdayHeight: MINIMAL_WEEKDAY_HEIGHT,
		dayHeight: MINIMAL_DAY_HEIGHT,
		highlightOffsetY: MINIMAL_HIGHLIGHT_OFFSET_Y,
	});
}

function appendRangeHighlights(
	svg: SVGSVGElement,
	days: CalendarDayModel[],
	cellWidth: number,
	geometry: RangeSegmentGeometry,
): void {
	const rangeDaysByWeek = new Map<number, CalendarDayModel[]>();

	for (const day of days) {
		if (day.highlight === "none") {
			continue;
		}

		const weekDays = rangeDaysByWeek.get(day.week) ?? [];
		weekDays.push(day);
		rangeDaysByWeek.set(day.week, weekDays);
	}

	for (const weekDays of rangeDaysByWeek.values()) {
		let runStart = 0;

		for (let index = 1; index <= weekDays.length; index += 1) {
			const firstDay = weekDays[runStart];
			const currentDay = weekDays[index];

			if (
				firstDay !== undefined &&
				currentDay !== undefined &&
				firstDay.isOutsideMonth === currentDay.isOutsideMonth
			) {
				continue;
			}

			const lastDay = weekDays[index - 1];
			if (firstDay !== undefined && lastDay !== undefined) {
				appendRangeSegment(
					svg,
					firstDay,
					lastDay,
					cellWidth,
					geometry,
				);
			}

			runStart = index;
		}
	}
}

function appendBasicSingleHighlight(
	svg: SVGSVGElement,
	day: CalendarDayModel,
	cellWidth: number,
): void {
	const x = BASIC_GRID_LEFT + day.weekday * cellWidth + 7;
	const y =
		BASIC_GRID_TOP +
		BASIC_WEEKDAY_HEIGHT +
		day.week * BASIC_DAY_HEIGHT +
		7;

	svg.append(
		createSvgElement("rect", {
			class: "calendar-blocks-selection-outline",
			x,
			y,
			width: cellWidth - 14,
			height: BASIC_DAY_HEIGHT - 14,
			rx: 18,
			"data-date": formatCalendarDate(day.date),
			"data-highlight": day.highlight,
		}),
	);
}

function appendRangeSegment(
	svg: SVGSVGElement,
	firstDay: CalendarDayModel,
	lastDay: CalendarDayModel,
	cellWidth: number,
	geometry: RangeSegmentGeometry,
): void {
	const roundStart =
		firstDay.highlight === "range-start" ||
		firstDay.highlight === "range-boundary";
	const roundEnd =
		lastDay.highlight === "range-end" ||
		lastDay.highlight === "range-boundary";
	const startInset = roundStart ? 7 : 0;
	const endInset = roundEnd ? 7 : 0;
	const x =
		geometry.gridLeft + firstDay.weekday * cellWidth + startInset;
	const y =
		geometry.gridTop +
		geometry.weekdayHeight +
		firstDay.week * geometry.dayHeight +
		7 +
		(geometry.highlightOffsetY ?? 0);
	const width =
		(lastDay.weekday - firstDay.weekday + 1) * cellWidth -
		startInset -
		endInset;
	const height = geometry.dayHeight - 14;
	const path = createRangeSegmentPath(
		x,
		y,
		width,
		height,
		18,
		roundStart,
		roundEnd,
	);
	const segmentClasses = ["calendar-blocks-range-segment"];

	if (firstDay.isOutsideMonth) {
		segmentClasses.push("calendar-blocks-range-segment--outside");
	}

	svg.append(
		createSvgElement("path", {
			class: "calendar-blocks-range-segment-background",
			d: path,
		}),
		createSvgElement("path", {
			class: segmentClasses.join(" "),
			d: path,
			"data-start-date": formatCalendarDate(firstDay.date),
			"data-end-date": formatCalendarDate(lastDay.date),
			"data-start-edge": roundStart ? "rounded" : "open",
			"data-end-edge": roundEnd ? "rounded" : "open",
			"data-overflow": String(firstDay.isOutsideMonth),
		}),
	);
}

function createRangeSegmentPath(
	x: number,
	y: number,
	width: number,
	height: number,
	radius: number,
	roundStart: boolean,
	roundEnd: boolean,
): string {
	const right = x + width;
	const bottom = y + height;
	const safeRadius = Math.min(radius, width / 2, height / 2);
	const commands = [
		`M ${x + (roundStart ? safeRadius : 0)} ${y}`,
	];

	if (roundEnd) {
		commands.push(
			`H ${right - safeRadius}`,
			`Q ${right} ${y} ${right} ${y + safeRadius}`,
			`V ${bottom - safeRadius}`,
			`Q ${right} ${bottom} ${right - safeRadius} ${bottom}`,
		);
	} else {
		commands.push(`H ${right}`, `V ${bottom}`);
	}

	if (roundStart) {
		commands.push(
			`H ${x + safeRadius}`,
			`Q ${x} ${bottom} ${x} ${bottom - safeRadius}`,
			`V ${y + safeRadius}`,
			`Q ${x} ${y} ${x + safeRadius} ${y}`,
		);
	} else {
		commands.push(`H ${x}`, `V ${y}`);
	}

	commands.push("Z");
	return commands.join(" ");
}

function appendBasicGrid(
	svg: SVGSVGElement,
	weekCount: number,
	cellWidth: number,
): void {
	const gridBottom =
		BASIC_GRID_TOP +
		BASIC_WEEKDAY_HEIGHT +
		weekCount * BASIC_DAY_HEIGHT;

	for (let column = 0; column <= 7; column += 1) {
		svg.append(
			createSvgElement("line", {
				class: "calendar-blocks-grid-line",
				x1: BASIC_GRID_LEFT + column * cellWidth,
				y1: BASIC_GRID_TOP,
				x2: BASIC_GRID_LEFT + column * cellWidth,
				y2: gridBottom,
			}),
		);
	}

	svg.append(
		createSvgElement("line", {
			class: "calendar-blocks-grid-line",
			x1: BASIC_GRID_LEFT,
			y1: BASIC_GRID_TOP,
			x2: BASIC_GRID_LEFT + BASIC_GRID_WIDTH,
			y2: BASIC_GRID_TOP,
		}),
		createSvgElement("line", {
			class: "calendar-blocks-grid-line",
			x1: BASIC_GRID_LEFT,
			y1: BASIC_GRID_TOP + BASIC_WEEKDAY_HEIGHT,
			x2: BASIC_GRID_LEFT + BASIC_GRID_WIDTH,
			y2: BASIC_GRID_TOP + BASIC_WEEKDAY_HEIGHT,
		}),
	);

	for (let week = 1; week <= weekCount; week += 1) {
		const y =
			BASIC_GRID_TOP +
			BASIC_WEEKDAY_HEIGHT +
			week * BASIC_DAY_HEIGHT;
		svg.append(
			createSvgElement("line", {
				class: "calendar-blocks-grid-line",
				x1: BASIC_GRID_LEFT,
				y1: y,
				x2: BASIC_GRID_LEFT + BASIC_GRID_WIDTH,
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

function formatMinimalMonthTitle(
	year: number,
	month: number,
	locale: string,
): string {
	const monthName = new Intl.DateTimeFormat(locale, {
		month: "long",
		timeZone: "UTC",
	}).format(toUtcDate({ year, month, day: 1 }));

	return monthName.toLocaleUpperCase(locale);
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

function getWeekdayLabels(
	locale: string,
	width: "narrow" | "short" = "short",
): string[] {
	const formatter = new Intl.DateTimeFormat(locale, {
		weekday: width,
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
