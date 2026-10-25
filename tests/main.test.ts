import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MarkdownPostProcessorContext } from "obsidian";

type BlockProcessor = (source: string, el: HTMLElement, context: MarkdownPostProcessorContext) => void;

const mocks = vi.hoisted(() => ({
	getFileByPath: vi.fn(),
	locale: vi.fn(() => "en"),
	render: vi.fn(),
	processors: new Map<string, BlockProcessor>(),
}));

vi.mock("obsidian", () => ({
	Plugin: class {
		app = { vault: { getFileByPath: mocks.getFileByPath } };
		loadData = async () => null;
		addSettingTab = () => {};
		registerMarkdownCodeBlockProcessor = (language: string, processor: BlockProcessor) => {
			mocks.processors.set(language, processor);
		};
	},
	moment: { locale: mocks.locale },
}));
vi.mock("../src/settings", () => ({
	DEFAULT_SETTINGS: { stretchCalendar: false, theme: "minimal" },
	isCalendarTheme: (value: unknown) => value === "minimal" || value === "basic",
	CalendarBlocksSettingTab: class {},
}));
vi.mock("../src/calendar-renderer", () => ({
	renderCalendarSelection: mocks.render,
	rerenderCalendarRoot: vi.fn(),
}));

import CalendarBlocksPlugin from "../src/main";

const context = { sourcePath: "folder/note.md" } as MarkdownPostProcessorContext;

async function process(source: string, language = "date") {
	const plugin = new CalendarBlocksPlugin({} as never, {} as never);
	await plugin.onload();
	const createDiv = vi.fn();
	const element = { createDiv } as unknown as HTMLElement;
	mocks.processors.get(language)!(source, element, context);
	return createDiv;
}

describe("date block processor", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.processors.clear();
		mocks.locale.mockReturnValue("en");
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
});
