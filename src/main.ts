import { moment, Plugin, type MarkdownPostProcessorContext } from "obsidian";

import {
	renderCalendarSelection,
	rerenderCalendarRoot,
} from "./calendar-renderer";
import { DATE_BLOCK_LANGUAGES } from "./date-block";
import {
	EXPECTED_DATE_FORMAT,
	parseDateInput,
} from "./date-parser";
import {
	type CalendarBlocksSettings,
	CalendarBlocksSettingTab,
	DEFAULT_SETTINGS,
} from "./settings";

export default class CalendarBlocksPlugin extends Plugin {
	settings: CalendarBlocksSettings = { ...DEFAULT_SETTINGS };

	async onload(): Promise<void> {
		await this.loadSettings();

		const processor = (
			source: string,
			element: HTMLElement,
			context: MarkdownPostProcessorContext,
		): void => {
			const file = this.app.vault.getFileByPath(context.sourcePath);
			const creationYear = file
				? new Date(file.stat.ctime).getFullYear()
				: undefined;
			const locale = moment.locale();
			const result = parseDateInput(source, creationYear, locale);

			if (!result.ok) {
				element.createDiv({
					cls: "calendar-blocks-error",
					text: `Invalid date block: ${result.message} Expected ${EXPECTED_DATE_FORMAT}.`,
				});
				return;
			}

			renderCalendarSelection(element, result.value, locale, {
				stretchCalendar: this.settings.stretchCalendar,
			});
		};

		for (const language of DATE_BLOCK_LANGUAGES) {
			this.registerMarkdownCodeBlockProcessor(language, processor);
		}

		this.addSettingTab(new CalendarBlocksSettingTab(this.app, this));
	}

	async updateSettings(settings: CalendarBlocksSettings): Promise<void> {
		this.settings = settings;
		await this.saveData(settings);
		this.updateRenderedCalendars();
	}

	private async loadSettings(): Promise<void> {
		const stored = (await this.loadData()) as
			| Partial<CalendarBlocksSettings>
			| null;

		this.settings = {
			stretchCalendar: stored?.stretchCalendar === true,
		};
	}

	private updateRenderedCalendars(): void {
		this.app.workspace.iterateAllLeaves((leaf) => {
			const roots =
				leaf.view.containerEl.querySelectorAll<HTMLElement>(
					".calendar-blocks-root",
				);

			roots.forEach((root) => {
				rerenderCalendarRoot(root, {
					stretchCalendar: this.settings.stretchCalendar,
				});
			});
		});
	}
}
