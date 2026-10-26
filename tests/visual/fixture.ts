import "../obsidian-dom";

import { renderCalendarSelection } from "../../src/calendar-renderer";
import { parseDateInput } from "../../src/date-parser";
import type { VisualCase } from "./markdown-fixtures";

declare global {
	interface Window {
		renderVisualCase: (visualCase: VisualCase, theme: string) => Promise<void>;
	}
}

window.renderVisualCase = async (visualCase, theme) => {
	document.getElementById("snippet")?.remove();
	const snippet = document.createElement("style");
	snippet.id = "snippet";
	snippet.textContent = visualCase.css ?? "";
	document.head.append(snippet);
	document.body.className = `theme-${theme}`;
	const fixture = document.querySelector<HTMLElement>("#fixture")!;
	const container = document.querySelector<HTMLElement>("#calendar")!;
	fixture.style.width = `${visualCase.width ?? 640}px`;
	const parsed = parseDateInput(visualCase.source, 2026, visualCase.locale ?? "en-US");
	if (!parsed.ok) throw new Error(parsed.message);
	renderCalendarSelection(container, parsed.value, visualCase.locale ?? "en-US", {
		stretchCalendar: visualCase.stretch ?? false,
		showToday: visualCase.showToday ?? true,
		localOverrides: parsed.overrides,
		markerSeed: visualCase.markerSeed ?? 7,
		fileName: `${visualCase.name}.md`,
		calendarIndex: 0,
	});
	await document.fonts.ready;
};
