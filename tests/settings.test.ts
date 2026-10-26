import { beforeEach, describe, expect, it, vi } from "vitest";
import type { App } from "obsidian";
import type CalendarBlocksPlugin from "../src/main";

const mocks = vi.hoisted(() => ({
	empty: vi.fn(), name: vi.fn(), desc: vi.fn(), value: vi.fn(),
	onChange: vi.fn(),
}));

vi.mock("obsidian", () => ({
	PluginSettingTab: class {
		containerEl = { empty: mocks.empty };
	},
	Setting: class {
		setName(name: string) { mocks.name(name); return this; }
		setDesc(desc: string) { mocks.desc(desc); return this; }
		addToggle(callback: (toggle: unknown) => void) {
			const toggle = {
				setValue(value: boolean) { mocks.value(value); return toggle; },
				onChange: mocks.onChange,
			};
			callback(toggle);
			return this;
		}
	},
}));

import { CalendarBlocksSettingTab } from "../src/settings";

function setup(stretchCalendar = false) {
	const plugin = {
		settings: { stretchCalendar, showToday: true },
		updateSettings: vi.fn(async (settings: { stretchCalendar: boolean; showToday: boolean }) => {
			plugin.settings = settings;
		}),
	};
	const tab = new CalendarBlocksSettingTab({} as App, plugin as unknown as CalendarBlocksPlugin);
	return { tab, plugin };
}

describe("Calendar Blocks settings", () => {
	beforeEach(() => vi.clearAllMocks());

	it("exposes a searchable toggle and resolves its persisted value", () => {
		const { tab } = setup(true);
		expect(tab.getSettingDefinitions()).toEqual([{
			name: "Stretch calendar",
			desc: "Use the full available note width instead of the compact calendar width.",
			control: { type: "toggle", key: "stretchCalendar", defaultValue: false },
		}, {
			name: "Show today",
			desc: "Mark today's date with a red hand-drawn outline.",
			control: { type: "toggle", key: "showToday", defaultValue: true },
		}]);
		expect(tab.getControlValue("stretchCalendar")).toBe(true);
		expect(tab.getControlValue("unknown")).toBeUndefined();
	});

	it("persists declarative changes through the plugin's rerendering path", async () => {
		const { tab, plugin } = setup();
		await tab.setControlValue("stretchCalendar", true);
		expect(plugin.updateSettings).toHaveBeenCalledWith({ stretchCalendar: true, showToday: true });
		expect(tab.getControlValue("stretchCalendar")).toBe(true);
	});

	it("keeps the legacy toggle consistent with the declarative setting", async () => {
		const { tab, plugin } = setup(true);
		tab.display();
		const [definition] = tab.getSettingDefinitions();
		expect(mocks.empty).toHaveBeenCalledOnce();
		expect(mocks.name).toHaveBeenCalledWith(definition.name);
		expect(mocks.desc).toHaveBeenCalledWith(definition.desc);
		expect(mocks.value).toHaveBeenCalledWith(true);
		await mocks.onChange.mock.calls[0][0](false);
		expect(plugin.updateSettings).toHaveBeenCalledWith({ stretchCalendar: false, showToday: true });
		expect(tab.getControlValue("stretchCalendar")).toBe(false);
	});

	it("persists Show today and keeps the legacy control in sync", async () => {
		const { tab, plugin } = setup();
		expect(tab.getControlValue("showToday")).toBe(true);
		await tab.setControlValue("showToday", false);
		expect(plugin.updateSettings).toHaveBeenCalledWith({ stretchCalendar: false, showToday: false });
		tab.display();
		expect(mocks.value).toHaveBeenNthCalledWith(2, false);
		await mocks.onChange.mock.calls[1][0](true);
		expect(tab.getControlValue("showToday")).toBe(true);
	});

	it("ignores unknown controls and non-boolean toggle values", async () => {
		const { tab, plugin } = setup();
		await tab.setControlValue("unknown", true);
		await tab.setControlValue("stretchCalendar", "true");
		expect(plugin.updateSettings).not.toHaveBeenCalled();
	});
});
