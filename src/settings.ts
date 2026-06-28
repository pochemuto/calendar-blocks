import { App, PluginSettingTab, Setting } from "obsidian";

import {
	CALENDAR_THEMES,
	type CalendarTheme,
} from "./calendar-renderer";
import type CalendarBlocksPlugin from "./main";

export interface CalendarBlocksSettings {
	stretchCalendar: boolean;
	theme: CalendarTheme;
}

export const DEFAULT_SETTINGS: CalendarBlocksSettings = {
	stretchCalendar: false,
	theme: "minimal",
};

export class CalendarBlocksSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private readonly plugin: CalendarBlocksPlugin,
	) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Calendar design")
			.setDesc("Choose the visual design used to render calendars.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("basic", "Basic")
					.addOption("minimal", "Minimal")
					.setValue(this.plugin.settings.theme)
					.onChange(async (value) => {
						if (!isCalendarTheme(value)) {
							return;
						}

						await this.plugin.updateSettings({
							...this.plugin.settings,
							theme: value,
						});
					}),
			);

		new Setting(containerEl)
			.setName("Stretch calendar")
			.setDesc(
				"Use the full available note width instead of the compact calendar width.",
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.stretchCalendar)
					.onChange(async (value) => {
						await this.plugin.updateSettings({
							...this.plugin.settings,
							stretchCalendar: value,
						});
					}),
			);
	}
}

export function isCalendarTheme(value: unknown): value is CalendarTheme {
	return CALENDAR_THEMES.some((theme) => theme === value);
}
