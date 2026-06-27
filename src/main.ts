import { moment, Plugin } from "obsidian";

import { renderCalendarSelection } from "./calendar-renderer";
import {
	EXPECTED_DATE_FORMAT,
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

			renderCalendarSelection(element, result.value, moment.locale());
		});
	}

	onunload(): void {
		console.log("[Calendar Blocks] unloaded");
	}
}
