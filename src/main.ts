import { moment, Plugin } from "obsidian";

import { renderCalendarSelection } from "./calendar-renderer";
import { DATE_BLOCK_LANGUAGES } from "./date-block";
import {
	EXPECTED_DATE_FORMAT,
	parseDateInput,
} from "./date-parser";

export default class CalendarBlocksPlugin extends Plugin {
	onload(): void {
		console.log("[Calendar Blocks] loaded");

		const processor = (source: string, element: HTMLElement): void => {
			const result = parseDateInput(source);

			if (!result.ok) {
				element.createDiv({
					cls: "calendar-blocks-error",
					text: `Invalid date block: ${result.message} Expected ${EXPECTED_DATE_FORMAT}.`,
				});
				return;
			}

			renderCalendarSelection(element, result.value, moment.locale());
		};

		for (const language of DATE_BLOCK_LANGUAGES) {
			this.registerMarkdownCodeBlockProcessor(language, processor);
		}
	}

	onunload(): void {
		console.log("[Calendar Blocks] unloaded");
	}
}
