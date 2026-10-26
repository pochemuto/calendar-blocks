import { describe, expect, it } from "vitest";
import { DATE_BLOCK_LANGUAGES, getCalendarBlockIndex } from "../src/date-block";

describe("DATE_BLOCK_LANGUAGES", () => {
	it("registers dates as an alias for date", () => {
		expect(DATE_BLOCK_LANGUAGES).toEqual(["date", "dates"]);
	});
});

describe("source calendar ordinal", () => {
	it("ignores calendar examples inside YAML frontmatter", () => {
		const markdown = [
			"---", "example: |", "  ```date", "  2026.10.26", "  ```", "---", "",
			"```date", "2026.10.26", "```",
		].join("\n");
		expect(getCalendarBlockIndex(markdown, 7)).toBe(0);
	});
	it("counts both aliases, skipping other languages and fenced examples", () => {
		const lines = [
			"```date", "2026.10.26", "```", "",
			"````markdown", "```date", "2026.10.26", "```", "````", "",
			"~~~js", "42", "~~~", "",
			"~~~dates", "2026.10.26", "~~~", "",
			"```date", "2026.10.26", "```",
		];
		const markdown = lines.join("\n");
		expect(getCalendarBlockIndex(markdown, 0)).toBe(0);
		expect(getCalendarBlockIndex(markdown, 14)).toBe(1);
		expect(getCalendarBlockIndex(markdown, 18)).toBe(2);
		expect(getCalendarBlockIndex(markdown.replace(/\n/g, "\r\n"), 18)).toBe(2);
	});

	it("counts nested list and blockquote calendars in source order", () => {
		const markdown = [
			"> ```date", "> 2026.10.26", "> ```", "",
			"- ```dates", "  2026.10.26", "  ```", "",
			"```date", "2026.10.26", "```",
		].join("\n");
		expect(getCalendarBlockIndex(markdown, 8)).toBe(2);
	});
});
