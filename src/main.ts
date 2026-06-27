import { Plugin } from "obsidian";

import {
	EXPECTED_DATE_FORMAT,
	formatDateSelection,
	parseDateInput,
} from "./date-parser";

export default class CalendarBlocksPlugin extends Plugin {
	onload(): void {
		console.log("[Calendar Blocks] loaded");

		this.registerMarkdownCodeBlockProcessor("date", (source, element) => {
			const result = parseDateInput(source);

			if (!result.ok) {
				element.createDiv({
					cls: "calendar-blocks-error",
					text: `Invalid date block: ${result.message} Expected ${EXPECTED_DATE_FORMAT}.`,
				});
				return;
			}

			element.createEl("em", {
				cls: "calendar-blocks-date",
				text: formatDateSelection(result.value),
			});
		});
	}

	onunload(): void {
		console.log("[Calendar Blocks] unloaded");
	}
}
