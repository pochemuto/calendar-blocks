import {
	type CalendarDayModel,
	type CalendarMonthModel,
	createCalendarDisplay,
} from "./calendar-model";
import {
	type CalendarDate,
	type DateSelection,
	formatCalendarDate,
	getDateEntries,
} from "./date-parser";
import { getEntryColors } from "./selection-palette";
import todayMarkerUrl from "./assets/today-marker.svg";
import todayMarker2Url from "./assets/today-marker-2.svg";
import todayMarker3Url from "./assets/today-marker-3.svg";
import todayMarker4Url from "./assets/today-marker-4.svg";
import { getTodayMarkerIndex } from "./today-marker";

const TODAY_MARKER_URLS = [todayMarkerUrl, todayMarker2Url, todayMarker3Url, todayMarker4Url];

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
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
export interface CalendarRenderOptions {
	stretchCalendar?: boolean;
	showToday?: boolean;
	fileName?: string;
	/** Zero-based order of the date/dates block in the source note. */
	calendarIndex?: number;
	/** Override the derived seed for visual regression fixtures. */
	markerSeed?: number;
}

interface CalendarRenderState {
	container: HTMLElement;
	selection: DateSelection;
	locale: string;
	fileName: string;
	calendarIndex: number;
	markerSeed?: number;
}

interface RangeSegmentGeometry {
	color: string;
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
	const now = new Date();
	// Today is the user's local civil date; calendar arithmetic remains UTC-based.
	const currentDate = {
		year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate(),
	};
	const today = options.showToday === false ? undefined : currentDate;
	const fileName = options.fileName ?? "";
	const calendarIndex = options.calendarIndex ?? 0;
	const todayMarker = TODAY_MARKER_URLS[getTodayMarkerIndex(currentDate, fileName, calendarIndex, options.markerSeed)];
	const root = createDiv();
	const calendars = createDiv();

	root.className = "calendar-blocks-root";
	root.classList.add("calendar-blocks-root--minimal");
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

	if (display.hasOmittedMonths && display.months.length === 2) {
		calendars.classList.add("calendar-blocks-calendars--omitted");
	}

	let row = calendars;
	if (display.months.length > 2) {
		calendars.className = "calendar-blocks-calendars calendar-blocks-calendars--multiple";
	}
	display.months.forEach((month, index) => {
		const previous = display.months[index - 1];
		const omitted = previous !== undefined &&
			(month.year - previous.year) * 12 + month.month - previous.month > 1;
		if (display.months.length > 2 && index % 2 === 0) {
			row = createDiv();
			const next = display.months[index + 1];
			const pairOmitted = next !== undefined &&
				(next.year - month.year) * 12 + next.month - month.month > 1;
			row.className = `calendar-blocks-calendars calendar-blocks-calendars--${next ? "dual" : "single"}${pairOmitted ? " calendar-blocks-calendars--omitted" : ""}`;
			calendars.append(row);
		}
		if (omitted) {
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
					d: "M 60 0 Q 0 30 60 60 T 60 120",
				}),
				createSvgElement("path", {
					class:
						"calendar-blocks-separator-wave calendar-blocks-separator-wave--horizontal",
					d: "M 0 60 Q 30 0 60 60 T 120 60",
				}),
			);
			if (display.months.length > 2 && index % 2 === 0) {
				separator.classList.add("calendar-blocks-separator--between-rows");
				calendars.insertBefore(separator, row);
			} else {
				row.append(separator);
			}
		}

		row.append(
			createMinimalCalendarSvg(month, selection, safeLocale, today, todayMarker),
		);
	});

	root.append(calendars);
	const legend = createLegend(selection);
	if (legend !== null) root.append(legend);
	container.replaceChildren(root);
	calendarRenderStates.set(root, {
		container,
		selection,
		locale: safeLocale,
		fileName,
		calendarIndex,
		markerSeed: options.markerSeed,
	});
}

function createLegend(selection: DateSelection): HTMLUListElement | null {
	const legend = createEl("ul");
	legend.className = "calendar-blocks-legend";
	const entries = getDateEntries(selection);
	const colors = getEntryColors(entries);
	entries.forEach((entry, index) => {
		if (!entry.label) return;
		const item = createEl("li");
		item.className = "calendar-blocks-legend-item";
		const marker = createSpan();
		marker.className = "calendar-blocks-legend-marker";
		if (entry.kind === "range") {
			marker.classList.add("calendar-blocks-legend-marker--range");
		}
		marker.setAttribute("aria-hidden", "true");
		marker.style.setProperty("--calendar-blocks-selection-color", colors[index]);
		const label = createSpan();
		label.className = "calendar-blocks-legend-label";
		label.textContent = entry.label;
		item.append(marker, label);
		legend.append(item);
	});
	return legend.childElementCount > 0 ? legend : null;
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
		{
			fileName: state.fileName,
			calendarIndex: state.calendarIndex,
			markerSeed: state.markerSeed,
			...options,
		},
	);
	return true;
}

function createMinimalCalendarSvg(
	month: CalendarMonthModel,
	selection: DateSelection,
	locale: string,
	today?: CalendarDate,
	todayMarker = todayMarkerUrl,
): SVGSVGElement {
	const height =
		MINIMAL_GRID_TOP +
		MINIMAL_WEEKDAY_HEIGHT +
		month.weekCount * MINIMAL_DAY_HEIGHT +
		MINIMAL_BOTTOM_PADDING;
	const monthTitle = formatMonthTitle(month.year, month.month, locale);
	const todayInMonth = today?.year === month.year && today.month === month.month ? today : undefined;
	const todayDescription = todayInMonth === undefined ? "" :
		`; ${new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(0, "day")}: ${formatCalendarDate(todayInMonth)}`;
	const accessibleLabel = formatAccessibleLabel(
		monthTitle,
		selection,
		locale,
	) + todayDescription;
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

	appendMinimalHighlights(svg, visibleDays, cellWidth, selection);

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
		} else if (day.highlight !== "none") {
			classes.push("calendar-blocks-range-day");
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
		if (todayInMonth?.day === day.date.day) {
			text.setAttribute("aria-current", "date");
		}
		svg.append(text);
	});
	const todayDay = visibleDays.find((day) => day.date.day === todayInMonth?.day);
	if (todayDay !== undefined) {
		const markerWidth = todayDay.highlight === "single" ? 76 : 60;
		const markerHeight = todayDay.highlight === "single" ? 70 : 52;
		// Keep the resource embedded in main.js so installation still needs only three files.
		svg.append(createSvgElement("image", {
			class: "calendar-blocks-today-marker",
			href: todayMarker,
			x: MINIMAL_GRID_LEFT + (todayDay.weekday + 0.5) * cellWidth - markerWidth / 2,
			y: MINIMAL_GRID_TOP + MINIMAL_WEEKDAY_HEIGHT +
				(todayDay.week + 0.5) * MINIMAL_DAY_HEIGHT + MINIMAL_HIGHLIGHT_OFFSET_Y - markerHeight / 2,
			width: markerWidth,
			height: markerHeight,
			"aria-hidden": "true",
			"data-date": formatCalendarDate(todayDay.date),
		}));
	}

	return svg;
}

function appendMinimalHighlights(
	svg: SVGSVGElement,
	days: CalendarDayModel[],
	cellWidth: number,
	selection: DateSelection,
): void {
	const entries = getDateEntries(selection);
	const colors = getEntryColors(entries);
	// Paint each range separately so translucent fills accumulate at intersections.
	// Assign colors across the whole block, including entries outside this month.
	entries.forEach((entry, index) => {
		if (entry.kind !== "range") return;
		const color = colors[index];
		const layerDays = days.map((day) => ({
			...day,
			highlight: day.highlights[index],
		}));
		appendRangeHighlights(svg, layerDays, cellWidth, {
			color,
			gridLeft: MINIMAL_GRID_LEFT,
			gridTop: MINIMAL_GRID_TOP,
			weekdayHeight: MINIMAL_WEEKDAY_HEIGHT,
			dayHeight: MINIMAL_DAY_HEIGHT,
			highlightOffsetY: MINIMAL_HIGHLIGHT_OFFSET_Y,
		});
	});
	// Single dates always cover ranges, independent of their source-line order.
	entries.forEach((entry, index) => {
		if (entry.kind !== "single") return;
		const day = days.find((day) => day.highlights[index] === "single");
		if (day === undefined) return;
		svg.append(createSvgElement("circle", {
			class: "calendar-blocks-selection-circle",
			style: `--calendar-blocks-selection-color: ${colors[index]}`,
			cx: MINIMAL_GRID_LEFT + (day.weekday + 0.5) * cellWidth,
			cy: MINIMAL_GRID_TOP + MINIMAL_WEEKDAY_HEIGHT +
				(day.week + 0.5) * MINIMAL_DAY_HEIGHT + MINIMAL_HIGHLIGHT_OFFSET_Y,
			r: 21,
			"data-date": formatCalendarDate(day.date),
			"data-highlight": "single",
		}));
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
		if (day.highlight === "none" || day.highlight === "single") {
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
			class: segmentClasses.join(" "),
			style: `--calendar-blocks-range-color: ${geometry.color}`,
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

	const labels = getDateEntries(selection).map((entry) => {
		const prefix = entry.label ? `${entry.label}: ` : "";
		if (entry.kind === "single") {
			return `${prefix}${dateFormatter.format(toUtcDate(entry.date))}`;
		}
		return `${prefix}${dateFormatter.format(toUtcDate(entry.start))} – ${dateFormatter.format(toUtcDate(entry.end))}`;
	});
	return `${monthTitle}: ${labels.join("; ")}`;
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
