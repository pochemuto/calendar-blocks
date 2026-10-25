import { App, PluginSettingTab, Setting } from "obsidian";

import type CalendarBlocksPlugin from "./main";

export interface CalendarBlocksSettings {
	stretchCalendar: boolean;
}

export const DEFAULT_SETTINGS: CalendarBlocksSettings = {
	stretchCalendar: false,
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
