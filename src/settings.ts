import { App, PluginSettingTab, Setting, type SettingDefinitionControl } from "obsidian";

import type CalendarBlocksPlugin from "./main";

export interface CalendarBlocksSettings {
	stretchCalendar: boolean;
	showToday: boolean;
}

export const DEFAULT_SETTINGS: CalendarBlocksSettings = {
	stretchCalendar: false,
	showToday: true,
};

export class CalendarBlocksSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private readonly plugin: CalendarBlocksPlugin,
	) {
		super(app, plugin);
	}

	getSettingDefinitions(): SettingDefinitionControl<keyof CalendarBlocksSettings>[] {
		return [{
			name: "Stretch calendar",
			desc: "Use the full available note width instead of the compact calendar width.",
			control: {
				type: "toggle",
				key: "stretchCalendar",
				defaultValue: DEFAULT_SETTINGS.stretchCalendar,
			},
		}, {
			name: "Show today",
			desc: "Mark today's date with a red hand-drawn outline.",
			control: {
				type: "toggle",
				key: "showToday",
				defaultValue: DEFAULT_SETTINGS.showToday,
			},
		}];
	}

	getControlValue(key: string): unknown {
		return key === "stretchCalendar" || key === "showToday"
			? this.plugin.settings[key] : undefined;
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		if ((key === "stretchCalendar" || key === "showToday") && typeof value === "boolean") {
			await this.plugin.updateSettings({ ...this.plugin.settings, [key]: value });
		}
	}

	// Obsidian before 1.13 renders settings imperatively. Newer versions use
	// the definitions above for both rendering and search indexing.
	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		for (const definition of this.getSettingDefinitions()) {
			const key = definition.control.key;
			new Setting(containerEl)
				.setName(definition.name)
				.setDesc(definition.desc ?? "")
				.addToggle((toggle) =>
					toggle
						.setValue(this.plugin.settings[key])
						.onChange((value) => this.setControlValue(key, value)),
				);
		}
	}
}
