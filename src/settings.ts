import { App, PluginSettingTab, Setting, type SettingDefinitionControl } from "obsidian";

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

	getSettingDefinitions(): SettingDefinitionControl<keyof CalendarBlocksSettings>[] {
		return [{
			name: "Stretch calendar",
			desc: "Use the full available note width instead of the compact calendar width.",
			control: {
				type: "toggle",
				key: "stretchCalendar",
				defaultValue: DEFAULT_SETTINGS.stretchCalendar,
			},
		}];
	}

	getControlValue(key: string): unknown {
		return key === "stretchCalendar" ? this.plugin.settings.stretchCalendar : undefined;
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		if (key === "stretchCalendar" && typeof value === "boolean") {
			await this.plugin.updateSettings({ ...this.plugin.settings, stretchCalendar: value });
		}
	}

	// Obsidian before 1.13 renders settings imperatively. Newer versions use
	// the definitions above for both rendering and search indexing.
	display(): void {
		const { containerEl } = this;
		const [definition] = this.getSettingDefinitions();

		containerEl.empty();

		new Setting(containerEl)
			.setName(definition.name)
			.setDesc(definition.desc ?? "")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.stretchCalendar)
				.onChange((value) => this.setControlValue("stretchCalendar", value)),
			);
	}
}
