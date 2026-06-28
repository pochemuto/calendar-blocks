import { moment, Plugin } from "obsidian";

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
	isCalendarTheme,
} from "./settings";

export default class CalendarBlocksPlugin extends Plugin {
	settings: CalendarBlocksSettings = { ...DEFAULT_SETTINGS };

	async onload(): Promise<void> {
		await this.loadSettings();
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

			renderCalendarSelection(element, result.value, moment.locale(), {
				stretchCalendar: this.settings.stretchCalendar,
				theme: this.settings.theme,
			});
		};

		for (const language of DATE_BLOCK_LANGUAGES) {
			this.registerMarkdownCodeBlockProcessor(language, processor);
		}

		this.addSettingTab(new CalendarBlocksSettingTab(this.app, this));
	}

	onunload(): void {
		console.log("[Calendar Blocks] unloaded");
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
			...DEFAULT_SETTINGS,
			...stored,
			stretchCalendar: stored?.stretchCalendar === true,
			theme: isCalendarTheme(stored?.theme)
				? stored.theme
				: DEFAULT_SETTINGS.theme,
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
					theme: this.settings.theme,
				});
			});
		});
	}
}
