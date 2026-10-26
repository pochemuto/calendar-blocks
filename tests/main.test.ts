import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MarkdownPostProcessorContext } from "obsidian";

type BlockProcessor = (source: string, el: HTMLElement, context: MarkdownPostProcessorContext) => void;

const mocks = vi.hoisted(() => ({
	getFileByPath: vi.fn(),
	loadData: vi.fn(),
	locale: vi.fn(() => "en"),
	render: vi.fn(),
	interval: vi.fn((_callback: () => void, _delay: number) => 1),
	rerender: vi.fn(),
	saveData: vi.fn(),
	iterateAllLeaves: vi.fn(),
	processors: new Map<string, BlockProcessor>(),
}));

vi.mock("obsidian", () => ({
	Plugin: class {
		app = { vault: { getFileByPath: mocks.getFileByPath }, workspace: { iterateAllLeaves: mocks.iterateAllLeaves } };
		registerInterval = vi.fn();
		saveData = mocks.saveData;
		loadData = mocks.loadData;
		addSettingTab = () => {};
		registerMarkdownCodeBlockProcessor = (language: string, processor: BlockProcessor) => {
			mocks.processors.set(language, processor);
		};
	},
	moment: { locale: mocks.locale },
}));
vi.mock("../src/settings", () => ({
	DEFAULT_SETTINGS: { stretchCalendar: false, showToday: true },
	CalendarBlocksSettingTab: class {},
}));
vi.mock("../src/calendar-renderer", () => ({
	renderCalendarSelection: mocks.render,
	rerenderCalendarRoot: mocks.rerender,
}));

import CalendarBlocksPlugin from "../src/main";

const context = { sourcePath: "folder/note.md", getSectionInfo: () => null } as unknown as MarkdownPostProcessorContext;

async function process(source: string, language = "date") {
	const plugin = new CalendarBlocksPlugin({} as never, {} as never);
	await plugin.onload();
	const createDiv = vi.fn();
	const element = { createDiv } as unknown as HTMLElement;
	mocks.processors.get(language)!(source, element, context);
	return createDiv;
}

describe("date block processor", () => {
	it.each(["date", "dates"])("passes local overrides for %s without changing saved settings", async (language) => {
		mocks.loadData.mockResolvedValueOnce({ showToday: false });
		await process("today no-stretch\nFeb 14 2026", language);
		expect(mocks.render).toHaveBeenCalledWith(expect.anything(), {
			kind: "single", date: { year: 2026, month: 2, day: 14 },
		}, "en", expect.objectContaining({
			showToday: false, localOverrides: { showToday: true, stretchCalendar: false },
		}));
		expect(mocks.saveData).not.toHaveBeenCalled();
	});
	afterEach(() => vi.unstubAllGlobals());
	beforeEach(() => {
		vi.clearAllMocks();
		vi.stubGlobal("window", { setInterval: mocks.interval });
		mocks.processors.clear();
		mocks.locale.mockReturnValue("en");
	});

	it.each(["basic", "minimal"])("ignores the removed %s design setting", async (theme) => {
		mocks.loadData.mockResolvedValueOnce({ theme, stretchCalendar: true });
		const plugin = new CalendarBlocksPlugin({} as never, {} as never);
		await plugin.onload();
		expect(plugin.settings).toEqual({ stretchCalendar: true, showToday: true });
		const element = { createDiv: vi.fn() } as unknown as HTMLElement;
		mocks.processors.get("date")!("2025.07.27", element, context);
		expect(mocks.render).toHaveBeenLastCalledWith(
			element,
			{ kind: "single", date: { year: 2025, month: 7, day: 27 } },
			"en",
			{ stretchCalendar: true, showToday: true, fileName: "note.md", calendarIndex: 0 },
		);
	});

	it("passes the filename and date-block ordinal independently of rendering order", async () => {
		const plugin = new CalendarBlocksPlugin({} as never, {} as never);
		await plugin.onload();
		const text = "```date\n2026.10.26\n```\n\n```js\n42\n```\n\n```dates\n2026.10.26\n```";
		const render = (lineStart: number) => mocks.processors.get("date")!(
			"2026.10.26", { createDiv: vi.fn() } as unknown as HTMLElement,
			{ ...context, getSectionInfo: () => ({ text, lineStart, lineEnd: lineStart + 2 }) },
		);
		render(8);
		expect(mocks.render).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), "en",
			expect.objectContaining({ fileName: "note.md", calendarIndex: 1 }));
		render(0);
		expect(mocks.render).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), "en",
			expect.objectContaining({ fileName: "note.md", calendarIndex: 0 }));
		render(8);
		expect(mocks.render).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), "en",
			expect.objectContaining({ fileName: "note.md", calendarIndex: 1 }));
	});

	it.each([undefined, {}, { showToday: false }, { showToday: true }])(
		"loads Show today with a backward-compatible enabled default: %j", async (stored) => {
			mocks.loadData.mockResolvedValueOnce(stored);
			const plugin = new CalendarBlocksPlugin({} as never, {} as never);
			await plugin.onload();
			expect(plugin.settings.showToday).toBe(stored?.showToday !== false);
		},
	);

	it("rerenders open calendars when Show today changes and when the local day changes", async () => {
		const plugin = new CalendarBlocksPlugin({} as never, {} as never);
		await plugin.onload();
		const root = {} as HTMLElement;
		mocks.iterateAllLeaves.mockImplementation((callback) => callback({
			view: { containerEl: { querySelectorAll: () => [root] } },
		}));
		await plugin.updateSettings({ stretchCalendar: false, showToday: false });
		expect(mocks.saveData).toHaveBeenCalledWith({ stretchCalendar: false, showToday: false });
		expect(mocks.rerender).toHaveBeenLastCalledWith(root, { stretchCalendar: false, showToday: false });
		const callback = mocks.interval.mock.calls[mocks.interval.mock.calls.length - 1][0] as () => void;
		mocks.rerender.mockClear();
		callback();
		expect(mocks.rerender).not.toHaveBeenCalled();
		const day = vi.spyOn(Date.prototype, "toDateString").mockReturnValue("next day");
		callback();
		expect(mocks.rerender).toHaveBeenCalledOnce();
		day.mockRestore();
		mocks.iterateAllLeaves.mockReset();
	});

	it.each(["date", "dates"])("uses the source note creation year for %s blocks", async (language) => {
		mocks.getFileByPath.mockReturnValue({
			stat: { ctime: new Date(2004, 5, 15).getTime(), mtime: new Date(2026, 5, 15).getTime() },
		});
		await process("1 Mar - 4 Apr", language);
		expect(mocks.getFileByPath).toHaveBeenCalledWith("folder/note.md");
		expect(mocks.render).toHaveBeenCalledWith(expect.anything(), {
			kind: "range",
			start: { year: 2004, month: 3, day: 1 },
			end: { year: 2004, month: 4, day: 4 },
		}, "en", expect.anything());
	});

	it("uses the Obsidian locale for both date parsing and rendering", async () => {
		mocks.locale.mockReturnValue("ru");
		mocks.getFileByPath.mockReturnValue({ stat: { ctime: new Date(2004, 5, 15).getTime() } });
		await process("1 марта - 4 апреля");
		expect(mocks.render).toHaveBeenCalledWith(expect.anything(), {
			kind: "range",
			start: { year: 2004, month: 3, day: 1 },
			end: { year: 2004, month: 4, day: 4 },
		}, "ru", expect.anything());
	});

	it("shows an error when a yearless date has no source file", async () => {
		mocks.getFileByPath.mockReturnValue(null);
		const createDiv = await process("1 Mar");
		expect(mocks.render).not.toHaveBeenCalled();
		expect(createDiv).toHaveBeenCalledWith(expect.objectContaining({
			cls: "calendar-blocks-error",
			text: expect.stringContaining("creation year is unavailable"),
		}));
	});

	it("renders explicit years even when the source file is missing", async () => {
		mocks.getFileByPath.mockReturnValue(null);
		await process("02.03.2026");
		expect(mocks.render).toHaveBeenCalledWith(expect.anything(), {
			kind: "single", date: { year: 2026, month: 3, day: 2 },
		}, "en", expect.anything());
	});

	it.each(["date", "dates"])("passes all entries and the note creation year for %s blocks", async (language) => {
	mocks.getFileByPath.mockReturnValue({ stat: { ctime: new Date(2004, 5, 15).getTime() } });
	await process("1 Mar - 4 Mar\n2 Mar", language);
	expect(mocks.render).toHaveBeenCalledWith(expect.anything(), {
		kind: "multiple", entries: [
			{ kind: "range", start: { year: 2004, month: 3, day: 1 }, end: { year: 2004, month: 3, day: 4 } },
			{ kind: "single", date: { year: 2004, month: 3, day: 2 } },
		],
	}, "en", expect.anything());
});

	it.each(["date", "dates"])("shows a compact error for more than 40 entries in %s", async (language) => {
		mocks.getFileByPath.mockReturnValue(null);
		const source = Array(40).fill("2026.06.05 - 2026.06.11").concat("2026.06.10").join("\n");
		const createDiv = await process(source, language);
		expect(mocks.render).not.toHaveBeenCalled();
		expect(createDiv).toHaveBeenCalledWith(expect.objectContaining({
			cls: "calendar-blocks-error",
			text: expect.stringContaining("at most 40 ranges and single dates in total"),
		}));
	});

	it.each(["date", "dates"])("infers a yearless range end without source metadata in %s", async (language) => {
		mocks.getFileByPath.mockReturnValue(null);
		const createDiv = await process("Vacation: 28 Dec 2005 - 1 Jan", language);
		expect(createDiv).not.toHaveBeenCalled();
		expect(mocks.render).toHaveBeenCalledWith(expect.anything(), {
			kind: "range", label: "Vacation",
			start: { year: 2005, month: 12, day: 28 },
			end: { year: 2006, month: 1, day: 1 },
		}, "en", expect.anything());
	});

	it.each(["date", "dates"])("infers a yearless range start without source metadata in %s", async (language) => {
		mocks.getFileByPath.mockReturnValue(null);
		const createDiv = await process("Vacation: 28 Dec - 1 Jan 2006", language);
		expect(createDiv).not.toHaveBeenCalled();
		expect(mocks.render).toHaveBeenCalledWith(expect.anything(), {
			kind: "range", label: "Vacation",
			start: { year: 2005, month: 12, day: 28 },
			end: { year: 2006, month: 1, day: 1 },
		}, "en", expect.anything());
	});

});
